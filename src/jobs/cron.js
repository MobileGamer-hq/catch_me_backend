const cron = require("node-cron");
const flushEngagements = require("./flushEngagements");
const tagSync = require("./tagSync");

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
