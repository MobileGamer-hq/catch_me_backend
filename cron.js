const cron = require("node-cron");
const flushEngagements = require("./jobs/flushEngagements");

cron.schedule("*/30 * * * *", async () => {
    console.log("Flushing engagement data...");
    await flushEngagements();
});
