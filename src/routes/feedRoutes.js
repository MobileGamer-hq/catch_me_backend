const express = require("express");
const { getUserFeed, getGranularFeed } = require("../controllers/feedController");
const router = express.Router();

// User
router.get("/:id", getUserFeed);

// Granular Content
router.get("/:id/:type/:subtype?", getGranularFeed);

module.exports = router;
