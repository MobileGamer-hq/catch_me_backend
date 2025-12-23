const express = require("express");
const {getUserFeed} = require("../controllers/feedController");
const router = express.Router();

//User
router.get("/:id", getUserFeed);



module.exports = router;
