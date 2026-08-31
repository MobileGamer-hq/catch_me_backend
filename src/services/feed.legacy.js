const { Realtime, Firestore } = require("../utils/db");
const { Cache } = require("../utils/cache");
const { FeedSystem } = require("./feed.service");

// Feed cache TTL: 4 hours
const FEED_CACHE_TTL_SECONDS = 4 * 60 * 60; // 14,400 seconds

/* -------------------------------------------------------------
   MAIN FEED GENERATION WITH REDIS CACHING
------------------------------------------------------------- */
async function generateUserFeed(userId, filter = "all", sessionContext = null) {
  try {
    const bucket = sessionContext?.bucket || "A";
    const normalizedFilter = (filter || "all").toLowerCase();
    const cacheKey = `feed:${userId}:${normalizedFilter}:${bucket}`;

    // 1. Check Redis Cache first
    const cachedFeed = await Cache.get(cacheKey);
    if (cachedFeed) {
      return cachedFeed;
    }

    // 2. Cache Miss - Fetch user and generate feed
    const user = await Firestore.getById("users", userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (sessionContext) {
      user.sessionContext = sessionContext;
    }

    // Use the FeedSystem class
    const feedSystem = new FeedSystem(user);
    const feed = await feedSystem.generateFeed(normalizedFilter);

    // 3. Cache the computed feed in Redis with 4-hour TTL
    await Cache.set(cacheKey, feed, FEED_CACHE_TTL_SECONDS);

    // 4. Save to Realtime Database asynchronously (fire-and-forget, non-blocking)
    const rtdbKey = normalizedFilter === "all" ? userId : `${userId}_${normalizedFilter}`;
    updateFeedInRealtimeDB(rtdbKey, { data: feed }).catch((err) => {
      console.warn("Background RTDB feed update failed:", err.message);
    });

    return feed;
  } catch (err) {
    console.error("generateUserFeed ERROR:", err);
    throw err;
  }
}

/* -------------------------------------------------------------
   GRANULAR FEED CONTENT GENERATION WITH REDIS CACHING
------------------------------------------------------------- */
async function getGranularContent(userId, type, filter = "all", subtype = null, sessionContext = null) {
  try {
    const bucket = sessionContext?.bucket || "A";
    const normalizedFilter = (filter || "all").toLowerCase();
    const cacheKey = `feed:granular:${userId}:${type}:${subtype || "all"}:${normalizedFilter}:${bucket}`;

    // 1. Check Redis Cache first
    const cachedContent = await Cache.get(cacheKey);
    if (cachedContent) {
      return cachedContent;
    }

    const user = await Firestore.getById("users", userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (sessionContext) {
      user.sessionContext = sessionContext;
    }

    const feedSystem = new FeedSystem(user);
    let result;

    switch (type) {
      case "posts":
      case "highlights":
      case "images":
      case "thoughts": {
        const posts = await feedSystem.fetchCandidatePosts(normalizedFilter);
        const scoredPosts = await feedSystem.scoreContent(posts, "post");
        const qualityPosts = feedSystem.filterByQuality(scoredPosts);
        let diversePosts = qualityPosts;
        if (normalizedFilter === "all" || normalizedFilter === "suggested") {
          diversePosts = feedSystem.applyDiversity(qualityPosts);
        }
        diversePosts.sort((a, b) => b.finalScore - a.finalScore);
        const categorizedPosts = feedSystem.categorizePosts(diversePosts);

        if (type === "posts") {
          result = subtype ? (categorizedPosts[subtype] || []) : categorizedPosts;
        } else {
          result = categorizedPosts[type] || [];
        }
        break;
      }

      case "games": {
        const games = await feedSystem.fetchCandidateGames(normalizedFilter);
        const scoredGames = await feedSystem.scoreContent(games, "game");
        const qualityGames = feedSystem.filterByQuality(scoredGames);
        qualityGames.sort((a, b) => b.finalScore - a.finalScore);
        result = qualityGames.slice(0, 100).map((g) => g.id);
        break;
      }

      case "users":
        result = await feedSystem.fetchSuggestedUsers();
        break;

      case "upcoming": {
        const upcomingGames = await feedSystem.getRecommendedGames();
        result = upcomingGames.map((g) => g.id);
        break;
      }

      case "popular": {
        const popularPosts = await feedSystem.fetchPopularContent();
        const categorizedPopular = feedSystem.categorizePosts(popularPosts);
        if (subtype) {
          result = categorizedPopular[subtype] || [];
        } else {
          result = categorizedPopular;
        }
        break;
      }

      default:
        throw new Error(`Unknown feed component type: ${type}`);
    }

    // 2. Cache the result in Redis with 4-hour TTL
    if (result) {
      await Cache.set(cacheKey, result, FEED_CACHE_TTL_SECONDS);
    }

    return result;
  } catch (err) {
    console.error(`getGranularContent (${type}) ERROR:`, err);
    throw err;
  }
}

/* -------------------------------------------------------------
   SAVE FEED TO REALTIME DATABASE (BACKGROUND HELPER)
------------------------------------------------------------- */
async function updateFeedInRealtimeDB(userId, feed) {
  await Realtime.update(`feed/${userId}`, feed);
}

module.exports = { generateUserFeed, getGranularContent };
