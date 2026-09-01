const express = require("express");
const router = express.Router();
const { getBatchByType, getMultiBatch } = require("../controllers/batchController");

// Universal batch fetch
// POST /api/batch
router.post("/", getMultiBatch);

// Type-specific batch fetch
// POST /api/batch/users, POST /api/batch/posts, POST /api/batch/events, POST /api/batch/games
router.post("/:type", getBatchByType);

module.exports = router;
