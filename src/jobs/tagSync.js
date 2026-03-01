const TagService = require("../services/tag.service");

/**
 * Executes the daily tag synchronization.
 */
const tagSyncJob = async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled tag sync...`);
  try {
    const result = await TagService.syncTags();
    console.log(
      `[${new Date().toISOString()}] Tag sync completed: ${result.tagsCount} tags processed.`,
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Scheduled tag sync failed:`,
      error,
    );
  }
};

module.exports = tagSyncJob;
