const { Firestore } = require("../utils/db");
const { db, admin } = require("../config/firebase");
const { GraphService } = require("../services/graph.service");
const Fuse = require("fuse.js");
const fs = require("fs");
const path = require("path");

const getUsers = async (req, res) => {
  try {
    const users = await Firestore.getAll("users");

    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await Firestore.getById("users", req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

/**
 * Delete a user and remove all their traces from other data (followers, following, likes, etc.).
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await Firestore.getById("users", id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const batch = db.batch();

    // 1. Cleanup in 'users' collection
    // Remove from followers, following, and blockedUsers of others
    const followersSnapshot = await db.collection("users").where("followers", "array-contains", id).get();
    const followingSnapshot = await db.collection("users").where("following", "array-contains", id).get();
    const blockedSnapshot = await db.collection("users").where("blockedUsers", "array-contains", id).get();

    followersSnapshot.forEach(doc => {
      batch.update(doc.ref, { followers: admin.firestore.FieldValue.arrayRemove(id) });
    });
    followingSnapshot.forEach(doc => {
      batch.update(doc.ref, { following: admin.firestore.FieldValue.arrayRemove(id) });
    });
    blockedSnapshot.forEach(doc => {
      batch.update(doc.ref, { blockedUsers: admin.firestore.FieldValue.arrayRemove(id) });
    });

    // 2. Cleanup in 'posts' collection
    // Remove from likes, shares, and saves of all posts
    const likedPostsSnapshot = await db.collection("posts").where("likes", "array-contains", id).get();
    const sharedPostsSnapshot = await db.collection("posts").where("shares", "array-contains", id).get();
    const savedPostsSnapshot = await db.collection("posts").where("saves", "array-contains", id).get();

    likedPostsSnapshot.forEach(doc => {
      batch.update(doc.ref, { likes: admin.firestore.FieldValue.arrayRemove(id) });
    });
    sharedPostsSnapshot.forEach(doc => {
      batch.update(doc.ref, { shares: admin.firestore.FieldValue.arrayRemove(id) });
    });
    savedPostsSnapshot.forEach(doc => {
      batch.update(doc.ref, { saves: admin.firestore.FieldValue.arrayRemove(id) });
    });

    // 3. Delete user's own posts
    const userPostsSnapshot = await db.collection("posts").where("userId", "==", id).get();
    userPostsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 4. Cleanup in 'events' collection
    // Remove from data.players and data.votes.userVotes
    const eventsWithPlayerSnapshot = await db.collection("events").where("data.players", "array-contains", id).get();
    eventsWithPlayerSnapshot.forEach(doc => {
      batch.update(doc.ref, { "data.players": admin.firestore.FieldValue.arrayRemove(id) });
    });

    // Note: data.votes.userVotes is a map { userId: vote }. Removing from a map is different.
    // We can use FieldValue.delete() but we need to know the specific path.
    const eventsWithVotesSnapshot = await db.collection("events").where(`data.votes.userVotes.${id}`, "!=", "").get();
    eventsWithVotesSnapshot.forEach(doc => {
      batch.update(doc.ref, { [`data.votes.userVotes.${id}`]: admin.firestore.FieldValue.delete() });
    });

    // 5. Delete the user document itself
    batch.delete(db.collection("users").doc(id));

    await batch.commit();

    res.status(200).json({ message: "User and all their traces deleted successfully" });
  } catch (err) {
    console.error("Error in deleteUser:", err);
    res.status(500).json({ error: "Failed to delete user", details: err.message });
  }
};

// Simple search by name using Firestore "where" queries
const searchUsers = async (req, res) => {
  try {
    const queryParam = req.query.q;

    if (!queryParam) {
      return res.status(400).json({ error: "Missing search query" });
    }

    // Firestore doesn't support full text search; this is a basic prefix search
    const snapshot = await db
      .collection("users")
      .where("name", ">=", queryParam)
      .where("name", "<=", queryParam + "\uf8ff")
      .get();

    const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
};

/**
 * Get 'You May Know' suggestions
 * GET /api/users/:id/suggestions
 */
const getSuggestions = async (req, res) => {
  try {
    const suggestions = await GraphService.getYouMayKnow(req.params.id);
    res.status(200).json(suggestions);
  } catch (err) {
    console.error("Suggestions Error:", err);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
};

/**
 * Local fuzzy search using minified JSON file.
 * Returns the closest matches based on name and username.
 * GET /api/users/local-search
 */
const localSearchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Missing search query" });
    }

    const filePath = path.join(__dirname, "..", "data", "users_min.json");

    if (!fs.existsSync(filePath)) {
      return res.status(503).json({ error: "Search index not ready. Please try again later." });
    }

    const fileData = fs.readFileSync(filePath, "utf8");
    const minUsersMap = JSON.parse(fileData);

    // Convert map to array for Fuse.js
    // We only take the 'data' field which contains the minified info
    const usersArray = Object.values(minUsersMap).map(u => u.data);

    const fuseOptions = {
      keys: ["name", "username"],
      threshold: 0.4, // Adjust for fuzziness (0.0 is exact match, 1.0 is everything)
      distance: 100,
      minMatchCharLength: 2,
    };

    const fuse = new Fuse(usersArray, fuseOptions);
    const results = fuse.search(query);

    // Filter to return only the 'item' (minified user data)
    const finalResults = results.map(r => r.item);

    res.status(200).json(finalResults);
  } catch (err) {
    console.error("Local search error:", err);
    res.status(500).json({ error: "Local search failed" });
  }
};

module.exports = { 
  getUsers, 
  getUser, 
  deleteUser, 
  searchUsers, 
  getSuggestions, 
  localSearchUsers 
};
