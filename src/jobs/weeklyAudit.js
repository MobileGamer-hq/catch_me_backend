const auditService = require("../services/auditService");

/**
 * Scheduled job to run the weekly data audit.
 */
const weeklyAuditJob = async () => {
  console.log(`[${new Date().toISOString()}] Starting weekly data audit job...`);
  try {
    const report = await auditService.runAudit();
    console.log(
      `[${new Date().toISOString()}] Weekly data audit job completed. Total issues: ${report.meta.issueCounts.totalIssues}. Notifications sent: ${report.meta.notificationSummary.sent}.`
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Weekly data audit job failed:`, error);
  }
};

module.exports = weeklyAuditJob;
