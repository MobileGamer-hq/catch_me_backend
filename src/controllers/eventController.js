const { db } = require("../config/firebase");
const Fuse = require("fuse.js");
const fs = require("fs");
const path = require("path");

const eventsCollection = db.collection("events");

// Update Event
const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventRef = eventsCollection.doc(eventId);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    await eventRef.update(req.body);
    res.status(200).json({ message: "Event updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update event", details: error.message });
  }
};

// Delete Event
const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    await eventsCollection.doc(eventId).delete();
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete event", details: error.message });
  }
};

// Get Event by ID
const getEventById = async (req, res) => {
  try {
    const doc = await eventsCollection.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json(doc.data());
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get event", details: error.message });
  }
};

// Get All Events
const getAllEvents = async (_req, res) => {
  try {
    const snapshot = await eventsCollection.get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get events", details: error.message });
  }
};

// Get Events by User ID
const getEventsByUserId = async (req, res) => {
  try {
    const snapshot = await eventsCollection
      .where("userId", "==", req.params.userId)
      .get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get user events", details: error.message });
  }
};

// Get Events by Type
const getEventsByType = async (req, res) => {
  try {
    const snapshot = await eventsCollection
      .where("type", "==", req.params.type)
      .get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get events by type", details: error.message });
  }
};

/**
 * Local fuzzy search for games using minified JSON file.
 * Searches title, sport, and tags.
 * GET /api/events/local-search
 */
const localSearchGames = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Missing search query" });
    }

    const filePath = path.join(__dirname, "..", "data", "games_min.json");

    if (!fs.existsSync(filePath)) {
      return res.status(503).json({ error: "Search index not ready. Please try again later." });
    }

    const fileData = fs.readFileSync(filePath, "utf8");
    const minGamesMap = JSON.parse(fileData);

    // Convert map to array for Fuse.js
    const gamesArray = Object.values(minGamesMap).map(g => g.data);

    const fuseOptions = {
      keys: ["title", "sport", "tags"],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 2,
    };

    const fuse = new Fuse(gamesArray, fuseOptions);
    const results = fuse.search(query);

    const finalResults = results.map(r => r.item);

    res.status(200).json(finalResults);
  } catch (err) {
    console.error("Local game search error:", err);
    res.status(500).json({ error: "Local search failed" });
  }
};

module.exports = {
  updateEvent,
  deleteEvent,
  getEventById,
  getAllEvents,
  getEventsByUserId,
  getEventsByType,
  localSearchGames,
};
