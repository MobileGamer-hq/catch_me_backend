const express = require("express");
const { searchAll } = require("../controllers/searchController");
const router = express.Router();

// Global Search
router.get("/", searchAll);

module.exports = router;
