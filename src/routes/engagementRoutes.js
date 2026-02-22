const express = require("express");
const router = express.Router();
const { recordSignal } = require("../controllers/engagementController");

// POST /api/engage/signal
router.post("/signal", recordSignal);

module.exports = router;
