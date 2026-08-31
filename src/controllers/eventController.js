const { db, admin } = require("../config/firebase");
const localSearchService = require("../services/localSearch.service");

const eventsCollection = db.collection("events");

// Update Event
const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventRef = eventsCollection.doc(eventId);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({ status: "FAILED", error: "Event not found" });
    }

    await eventRef.update(req.body);
    res.status(200).json({ status: "SUCCESS", message: "Event updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ status: "FAILED", error: "Failed to update event", details: error.message });
  }
};

/**
 * Delete an event and remove all its traces from users (events, games, feed, etc.).
 * DELETE /api/events/:id
 */
const deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check if event exists
    const eventRef = eventsCollection.doc(id);
    const doc = await eventRef.get();
    if (!doc.exists) {
      return res.status(404).json({ status: "FAILED", error: "Event not found" });
    }

    const batch = db.batch();

    // 2. Cleanup in 'users' collection
    // We remove the eventId from various arrays in user documents
    const arraysToCleanup = [
      "events",
      "games",
      "myCustomEvents",
      "myGames",
      "feed.events",
      "feed.games"
    ];

    for (const field of arraysToCleanup) {
      const snapshot = await db.collection("users").where(field, "array-contains", id).get();
      snapshot.forEach(userDoc => {
        batch.update(userDoc.ref, {
          [field]: admin.firestore.FieldValue.arrayRemove(id)
        });
      });
    }

    // 3. Delete the event itself
    batch.delete(eventRef);

    await batch.commit();

    res.status(200).json({ status: "SUCCESS", message: "Event and its traces deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res
      .status(500)
      .json({ status: "FAILED", error: "Failed to delete event", details: error.message });
  }
};

// Get Event by ID
const getEventById = async (req, res) => {
  try {
    const doc = await eventsCollection.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ status: "FAILED", error: "Event not found" });
    }
    res.status(200).json({ status: "SUCCESS", ...doc.data() });
  } catch (error) {
    res
      .status(500)
      .json({ status: "FAILED", error: "Failed to get event", details: error.message });
  }
};

// Get All Events
const getAllEvents = async (_req, res) => {
  try {
    const snapshot = await eventsCollection.get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.status(200).json({ status: "SUCCESS", data: events });
  } catch (error) {
    res
      .status(500)
      .json({ status: "FAILED", error: "Failed to get events", details: error.message });
  }
};

// Get Events by User ID
const getEventsByUserId = async (req, res) => {
  try {
    const snapshot = await eventsCollection
      .where("userId", "==", req.params.userId)
      .get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.status(200).json({ status: "SUCCESS", data: events });
  } catch (error) {
    res
      .status(500)
      .json({ status: "FAILED", error: "Failed to get user events", details: error.message });
  }
};

// Get Events by Type
const getEventsByType = async (req, res) => {
  try {
    const snapshot = await eventsCollection
      .where("type", "==", req.params.type)
      .get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.status(200).json({ status: "SUCCESS", data: events });
  } catch (error) {
    res
      .status(500)
      .json({ status: "FAILED", error: "Failed to get events by type", details: error.message });
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
      return res.status(400).json({ status: "FAILED", error: "Missing search query" });
    }

    const finalResults = await localSearchService.searchGames(query);

    if (finalResults === null) {
      return res.status(503).json({ status: "FAILED", error: "Search index not ready. Please try again later." });
    }

    res.status(200).json({ status: "SUCCESS", data: finalResults });
  } catch (err) {
    console.error("Local game search error:", err);
    res.status(500).json({ status: "FAILED", error: "Local search failed" });
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
