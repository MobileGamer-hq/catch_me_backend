const { Firestore } = require("../utils/db");
const { db, admin } = require("../config/firebase");
const { GraphService } = require("../services/graph.service");
const localSearchService = require("../services/localSearch.service");
const { Cache } = require("../utils/cache");

const getUsers = async (req, res) => {
  try {
    // 1. Check Redis cache for users list
    const cachedUsers = await Cache.get("users:all_list");
    if (cachedUsers && Array.isArray(cachedUsers)) {
      return res.status(200).json({ status: "SUCCESS", data: cachedUsers });
    }

    const users = await Firestore.getAll("users");
    // Cache for 15 minutes (900s)
    await Cache.set("users:all_list", users, 900);

    res.status(200).json({ status: "SUCCESS", data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED", error: "Failed to fetch users" });
  }
};

const getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const cacheKey = `user:profile:${userId}`;

    // 1. Check Redis cache
    const cachedUser = await Cache.get(cacheKey);
    if (cachedUser) {
      return res.status(200).json({ status: "SUCCESS", ...cachedUser });
    }

    // 2. Fetch from Firestore on cache miss
    const user = await Firestore.getById("users", userId);

    if (!user) {
      return res.status(404).json({ status: "FAILED", error: "User not found" });
    }

    // 3. Cache for 1 hour (3600s)
    await Cache.set(cacheKey, user, 3600);

    res.status(200).json({ status: "SUCCESS", ...user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED", error: "Failed to fetch user" });
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
      return res.status(404).json({ status: "FAILED", error: "User not found" });
    }

    const batch = db.batch();

    // 1. Cleanup in 'users' collection
    // Remove from followers, following, and blockedUsers of others
    const followersSnapshot = await db
      .collection("users")
      .where("followers", "array-contains", id)
      .get();
    const followingSnapshot = await db
      .collection("users")
      .where("following", "array-contains", id)
      .get();
    const blockedSnapshot = await db
      .collection("users")
      .where("blockedUsers", "array-contains", id)
      .get();

    followersSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        followers: admin.firestore.FieldValue.arrayRemove(id),
      });
    });
    followingSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        following: admin.firestore.FieldValue.arrayRemove(id),
      });
    });
    blockedSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        blockedUsers: admin.firestore.FieldValue.arrayRemove(id),
      });
    });

    // 2. Cleanup in 'posts' collection
    // Remove from likes, shares, and saves of all posts
    const likedPostsSnapshot = await db
      .collection("posts")
      .where("likes", "array-contains", id)
      .get();
    const sharedPostsSnapshot = await db
      .collection("posts")
      .where("shares", "array-contains", id)
      .get();
    const savedPostsSnapshot = await db
      .collection("posts")
      .where("saves", "array-contains", id)
      .get();

    likedPostsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        likes: admin.firestore.FieldValue.arrayRemove(id),
      });
    });
    sharedPostsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        shares: admin.firestore.FieldValue.arrayRemove(id),
      });
    });
    savedPostsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        saves: admin.firestore.FieldValue.arrayRemove(id),
      });
    });

    // 3. Delete user's own posts
    const userPostsSnapshot = await db
      .collection("posts")
      .where("userId", "==", id)
      .get();
    userPostsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 4. Cleanup in 'events' collection
    // Remove from data.players and data.votes.userVotes
    const eventsWithPlayerSnapshot = await db
      .collection("events")
      .where("data.players", "array-contains", id)
      .get();
    eventsWithPlayerSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        "data.players": admin.firestore.FieldValue.arrayRemove(id),
      });
    });

    // Note: data.votes.userVotes is a map { userId: vote }. Removing from a map is different.
    // We can use FieldValue.delete() but we need to know the specific path.
    const eventsWithVotesSnapshot = await db
      .collection("events")
      .where(`data.votes.userVotes.${id}`, "!=", "")
      .get();
    eventsWithVotesSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        [`data.votes.userVotes.${id}`]: admin.firestore.FieldValue.delete(),
      });
    });

    // 5. Cleanup in 'chats' collection
    // Delete all chats the user was part of
    const chatsSnapshot = await db
      .collection("chats")
      .where("members", "array-contains", id)
      .get();
    chatsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 6. Delete the user document itself
    batch.delete(db.collection("users").doc(id));

    await batch.commit();

    // Invalidate Redis caches
    await Promise.all([
      Cache.del(`user:profile:${id}`),
      Cache.del(`suggestions:${id}:10`),
      Cache.del(`feed:${id}:all:A`),
      Cache.del(`feed:${id}:all:B`),
      Cache.del("users:all_list"),
      Cache.del("suggestions:top_athletes_and_teams"),
    ]);

    res
      .status(200)
      .json({ status: "SUCCESS", message: "User and all their traces deleted successfully" });
  } catch (err) {
    console.error("Error in deleteUser:", err);
    res
      .status(500)
      .json({ status: "FAILED", error: "Failed to delete user", details: err.message });
  }
};

// Simple search by name using Firestore "where" queries
const searchUsers = async (req, res) => {
  try {
    const queryParam = req.query.q;

    if (!queryParam) {
      return res.status(400).json({ status: "FAILED", error: "Missing search query" });
    }

    // Firestore doesn't support full text search; this is a basic prefix search
    const snapshot = await db
      .collection("users")
      .where("name", ">=", queryParam)
      .where("name", "<=", queryParam + "\uf8ff")
      .get();

    const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ status: "SUCCESS", data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED", error: "Search failed" });
  }
};

/**
 * Get 'You May Know' suggestions
 * GET /api/users/:id/suggestions
 */
const getSuggestions = async (req, res) => {
  try {
    const suggestions = await GraphService.getYouMayKnow(req.params.id);
    res.status(200).json({ status: "SUCCESS", data: suggestions });
  } catch (err) {
    console.error("Suggestions Error:", err);
    res.status(500).json({ status: "FAILED", error: "Failed to get suggestions" });
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
      return res.status(400).json({ status: "FAILED", error: "Missing search query" });
    }

    const finalResults = await localSearchService.searchUsers(query);

    if (finalResults === null) {
      return res
        .status(503)
        .json({ status: "FAILED", error: "Search index not ready. Please try again later." });
    }

    res.status(200).json({ status: "SUCCESS", data: finalResults });
  } catch (err) {
    console.error("Local search error:", err);
    res.status(500).json({ status: "FAILED", error: "Local search failed" });
  }
};

module.exports = {
  getUsers,
  getUser,
  deleteUser,
  searchUsers,
  getSuggestions,
  localSearchUsers,
};
