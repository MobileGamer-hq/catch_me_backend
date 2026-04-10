const cron = require("node-cron");
const flushEngagements = require("./flushEngagements");
const tagSync = require("./tagSync");
const cleanupNotifications = require("./cleanupNotifications");
const syncMinUsers = require("./syncMinUsers");
const syncMinPosts = require("./syncMinPosts");
const syncMinGames = require("./syncMinGames");

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

// Sync minified posts daily at 4 AM
cron.schedule("0 4 * * *", async () => {
  console.log("Starting daily minified post sync...");
  await syncMinPosts();
});

// Sync minified games daily at 5 AM
cron.schedule("0 5 * * *", async () => {
  console.log("Starting daily minified game sync...");
  await syncMinGames();
});
