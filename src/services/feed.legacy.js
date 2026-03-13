const { Realtime } = require("../utils/db");
const { FeedSystem } = require("./feed.service");

/* -------------------------------------------------------------
   MAIN FEED GENERATION
------------------------------------------------------------- */
async function generateUserFeed(userId, filter = "all") {
  try {
    const { Firestore } = require("../utils/db");
    const user = await Firestore.getById("users", userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Use the new FeedSystem class
    const feedSystem = new FeedSystem(user);
    const feed = await feedSystem.generateFeed(filter);

    // Save to Realtime Database
    // We only save the "all" feed to cache for now, or use a filtered key
    const cacheKey = filter === "all" ? userId : `${userId}_${filter}`;
    await updateFeedInRealtimeDB(cacheKey, { data: feed });

    return feed;
  } catch (err) {
    console.error("generateUserFeed ERROR:", err);
    throw err;
  }
}

/* -------------------------------------------------------------
   GRANULAR FEED CONTENT GENERATION
------------------------------------------------------------- */
async function getGranularContent(userId, type, filter = "all", subtype = null) {
  try {
    const { Firestore } = require("../utils/db");
    const user = await Firestore.getById("users", userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const feedSystem = new FeedSystem(user);
    const activeFilter = (filter || "all").toLowerCase();

    switch (type) {
      case "posts":
      case "highlights":
      case "images":
      case "thoughts":
        const posts = await feedSystem.fetchCandidatePosts(activeFilter);
        const scoredPosts = await feedSystem.scoreContent(posts, "post");
        const qualityPosts = feedSystem.filterByQuality(scoredPosts);
        let diversePosts = qualityPosts;
        if (activeFilter === "all" || activeFilter === "suggested") {
          diversePosts = feedSystem.applyDiversity(qualityPosts);
        }
        diversePosts.sort((a, b) => b.finalScore - a.finalScore);
        const categorizedPosts = feedSystem.categorizePosts(diversePosts);
        
        if (type === "posts") {
          return subtype ? (categorizedPosts[subtype] || []) : categorizedPosts;
        }
        return categorizedPosts[type] || [];

      case "games":
        const games = await feedSystem.fetchCandidateGames(activeFilter);
        const scoredGames = await feedSystem.scoreContent(games, "game");
        const qualityGames = feedSystem.filterByQuality(scoredGames);
        qualityGames.sort((a, b) => b.finalScore - a.finalScore);
        return qualityGames.slice(0, 100).map((g) => g.id);

      case "users":
        return await feedSystem.fetchSuggestedUsers();

      case "upcoming":
        const upcomingGames = await feedSystem.getRecommendedGames();
        return upcomingGames.map((g) => g.id);
      
      case "popular":
        const popularPosts = await feedSystem.fetchPopularContent();
        const categorizedPopular = feedSystem.categorizePosts(popularPosts);
        if (subtype) {
           return categorizedPopular[subtype] || [];
        }
        return categorizedPopular;

      default:
        throw new Error(`Unknown feed component type: ${type}`);
    }
  } catch (err) {
    console.error(`getGranularContent (${type}) ERROR:`, err);
    throw err;
  }
}


/* -------------------------------------------------------------
   SAVE FEED TO REALTIME DATABASE
------------------------------------------------------------- */
async function updateFeedInRealtimeDB(userId, feed) {
  await Realtime.update(`feed/${userId}`, feed);
}

module.exports = { generateUserFeed, getGranularContent };
