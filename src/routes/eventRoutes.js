const express = require("express");
const router = express.Router();
const {getAllEvents, getEventById, deleteEvent, getEventsByType, localSearchGames} = require("../controllers/eventController");

//User
router.get("/", getAllEvents); // get all users
router.get("/local-search", localSearchGames); // fuzzy search on minified local data
router.get("/:id", getEventById); //
router.delete('/:id', deleteEvent ); //
router.get("/:type", getEventsByType);



module.exports = router;
