const express = require("express");
const router = express.Router();
const {
  getAllEvents,
  getEventById,
  deleteEvent,
  getEventsByType,
  localSearchGames,
} = require("../controllers/eventController");
const { getBatchByType } = require("../controllers/batchController");

// Events
router.get("/", getAllEvents); // get all events
router.post("/batch", (req, res, next) => {
  req.params.type = "events";
  return getBatchByType(req, res, next);
}); // batch get events by IDs (Redis-first)

router.get("/local-search", localSearchGames); // fuzzy search on minified local data
router.get("/:id", getEventById);
router.delete("/:id", deleteEvent);
router.get("/:type", getEventsByType);

module.exports = router;
