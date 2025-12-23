const { db } = require("../firebase");
const { v4: uuidv4 } = require("uuid");

const eventsCollection = db.collection("events");

// Create Event
const createEvent = async (req, res) => {
  try {
    const newEvent = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    await eventsCollection.doc(newEvent.id).set(newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ error: "Failed to create event", details: error.message });
  }
};

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
    res.status(500).json({ error: "Failed to update event", details: error.message });
  }
};

// Delete Event
const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    await eventsCollection.doc(eventId).delete();
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event", details: error.message });
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
    res.status(500).json({ error: "Failed to get event", details: error.message });
  }
};

// Get All Events
const getAllEvents = async (_req, res) => {
  try {
    const snapshot = await eventsCollection.get();
    const events = snapshot.docs.map(doc => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get events", details: error.message });
  }
};

// Get Events by User ID
const getEventsByUserId = async (req, res) => {
  try {
    const snapshot = await eventsCollection.where("userId", "==", req.params.userId).get();
    const events = snapshot.docs.map(doc => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get user events", details: error.message });
  }
};

// Get Events by Type
const getEventsByType = async (req, res) => {
  try {
    const snapshot = await eventsCollection.where("type", "==", req.params.type).get();
    const events = snapshot.docs.map(doc => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get events by type", details: error.message });
  }
};

// Get Events by Status
const getEventsByStatus = async (req, res) => {
  try {
    const snapshot = await eventsCollection.where("status", "==", req.params.status).get();
    const events = snapshot.docs.map(doc => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get events by status", details: error.message });
  }
};

// Get Events by Location
const getEventsByLocation = async (req, res) => {
  try {
    const snapshot = await eventsCollection.where("location", "==", req.params.location).get();
    const events = snapshot.docs.map(doc => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get events by location", details: error.message });
  }
};

// Get Events by Date Range
const getEventsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.params;
    const snapshot = await eventsCollection
      .where("date", ">=", start)
      .where("date", "<=", end)
      .get();
    const events = snapshot.docs.map(doc => doc.data());
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get events by date range", details: error.message });
  }
};

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  getAllEvents,
  getEventsByUserId,
  getEventsByType,
  getEventsByStatus,
  getEventsByLocation,
  getEventsByDateRange,
};
