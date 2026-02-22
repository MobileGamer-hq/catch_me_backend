const { Realtime } = require("../utils/db");
const { FeedSystem } = require("./feed.service");

/* -------------------------------------------------------------
   MAIN FEED GENERATION
------------------------------------------------------------- */
async function generateUserFeed(userId) {
  try {
    const { Firestore } = require("../utils/db");
    const user = await Firestore.getById("users", userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Use the new FeedSystem class
    const feedSystem = new FeedSystem(user);
    const feed = await feedSystem.generateFeed();

    // Save to Realtime Database
    await updateFeedInRealtimeDB(userId, { data: feed });

    return feed;
  } catch (err) {
    console.error("generateUserFeed ERROR:", err);
    throw err;
  }
}

/* -------------------------------------------------------------
   SAVE FEED TO REALTIME DATABASE
------------------------------------------------------------- */
async function updateFeedInRealtimeDB(userId, feed) {
  await Realtime.update(`feed/${userId}`, feed);
}

module.exports = { generateUserFeed };
