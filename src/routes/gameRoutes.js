const express = require("express");
const router = express.Router();
const {  getUser, deleteUser, searchUsers, getUsers } = require("../controllers/userController");
const {getEventsByType, getAllEvents, getEventById, deleteEvent} = require("../controllers/eventController");

//User
router.get("/", getAllEvents); // get all users
router.get("/:id", getEventById); //
router.delete('/:id', deleteEvent ); // -- not correct work on the whole file



module.exports = router;
