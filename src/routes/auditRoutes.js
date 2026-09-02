const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");

// Run weekly audit (can be triggered via POST or GET)
router.post("/run", auditController.runAudit);
router.get("/run", auditController.runAudit);

// Fetch current weekly report from Realtime Database
router.get("/report", auditController.getAuditReport);

// Fetch notification history for audit alerts
router.get("/history", auditController.getNotificationHistory);

// Delete/clear current weekly report
router.delete("/report", auditController.clearAuditReport);

module.exports = router;
