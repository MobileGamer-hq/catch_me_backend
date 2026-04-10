const cron = require("node-cron");
const flushEngagements = require("./flushEngagements");
const tagSync = require("./tagSync");
const cleanupNotifications = require("./cleanupNotifications");
const syncMinUsers = require("./syncMinUsers");

// Flush engagement data every 30 minutes
cron.schedule("*/30 * * * *", async () => {
  console.log("Flushing engagement data...");
  await flushEngagements();
});

// Sync tags once a day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Starting daily tag sync...");
  await tagSync();
});

// Cleanup notifications daily at 12 PM
cron.schedule("0 12 * * *", async () => {
  console.log("Starting daily notification cleanup...");
  await cleanupNotifications();
});

// Sync minified users daily at 3 AM
cron.schedule("0 3 * * *", async () => {
  console.log("Starting daily minified user sync...");
  await syncMinUsers();
});
