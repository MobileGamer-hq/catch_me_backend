const { Firestore } = require("../utils/db");
const { db } = require("../config/firebase");
const { GraphService } = require("../services/graph.service");

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

const deleteUser = async (req, res) => {
  try {
    const user = await Firestore.getById("users", req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await Firestore.deleteById("users", req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
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

module.exports = { getUsers, getUser, deleteUser, searchUsers, getSuggestions };
