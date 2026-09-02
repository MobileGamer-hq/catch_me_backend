const auditService = require("../services/auditService");

/**
 * Trigger an audit execution on-demand.
 * POST /api/audit/run (optional query: ?dryRun=true)
 */
const runAudit = async (req, res) => {
  try {
    const isDryRun = req.query.dryRun === "true" || req.body?.dryRun === true;
    const report = await auditService.runAudit({ dryRun: isDryRun });

    return res.status(200).json({
      status: "SUCCESS",
      message: isDryRun
        ? "Audit dry-run completed. No notifications sent and RTDB not modified."
        : "Weekly data audit executed and persisted to Realtime Database successfully.",
      ...report,
    });
  } catch (error) {
    console.error("[AuditController] Error running audit:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Failed to run data audit",
      details: error.message,
    });
  }
};

/**
 * Retrieve the latest weekly audit report from Realtime Database.
 * GET /api/audit/report
 */
const getAuditReport = async (req, res) => {
  try {
    const report = await auditService.getLatestReport();

    if (!report) {
      return res.status(404).json({
        status: "FAILED",
        error: "No active audit report found in Realtime Database. Run an audit first.",
      });
    }

    return res.status(200).json({
      status: "SUCCESS",
      ...report,
    });
  } catch (error) {
    console.error("[AuditController] Error fetching audit report:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Failed to fetch audit report",
      details: error.message,
    });
  }
};

/**
 * Retrieve user notification history to see which users have been notified or failed.
 * GET /api/audit/history
 */
const getNotificationHistory = async (req, res) => {
  try {
    const history = await auditService.getNotificationHistory();

    return res.status(200).json({
      status: "SUCCESS",
      data: history,
    });
  } catch (error) {
    console.error("[AuditController] Error fetching notification history:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Failed to fetch notification history",
      details: error.message,
    });
  }
};

/**
 * Clear the audit report from Realtime Database.
 * DELETE /api/audit/report
 */
const clearAuditReport = async (req, res) => {
  try {
    await auditService.clearReport();

    return res.status(200).json({
      status: "SUCCESS",
      message: "Audit report deleted from Realtime Database successfully.",
    });
  } catch (error) {
    console.error("[AuditController] Error clearing audit report:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Failed to clear audit report",
      details: error.message,
    });
  }
};

module.exports = {
  runAudit,
  getAuditReport,
  getNotificationHistory,
  clearAuditReport,
};
