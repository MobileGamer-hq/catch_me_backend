const { db, realtime } = require("../config/firebase");
const { Cache } = require("../utils/cache");

class LeaderboardService {
  /**
   * Generates a unique cache key based on the applied filters.
   * @param {Object} filters
   * @returns {string}
   */
  static generateCacheKey(filters) {
    const keys = ["role", "country", "location", "region", "sport"];
    const parts = keys.map((key) => {
      return filters[key]
        ? `${key}_${filters[key].toLowerCase().replace(/\s+/g, "")}`
        : `${key}_all`;
    });
    return parts.join("-");
  }

  /**
   * Calculates a user's score based on their stats.
   * @param {Object} user
   * @returns {number}
   */
  static calculateScore(user) {
    const level = Number(user.level) || 0;
    const xp = Number(user.xp) || 0;
    const followersCount = Array.isArray(user.followers)
      ? user.followers.length
      : 0;
    const postsCount = Array.isArray(user.posts) ? user.posts.length : 0;

    // Weight formula: Level + XP + Followers + Posts
    return level * 100 + xp + followersCount * 5 + postsCount * 2;
  }

  /**
   * Fetches and ranks users based on filters, utilizing Redis first and RTDB as fallback.
   * @param {Object} filters Query parameters like role, country, sport, etc.
   * @param {number} limit Max number of results.
   * @param {number} page Page number for pagination.
   * @returns {Promise<Object>} The ranked users and total count.
   */
  static async getRankings(filters = {}, limit = 50, page = 1) {
    const cacheKey = this.generateCacheKey(filters);
    const redisKey = `leaderboard:${cacheKey}`;

    // 1. Check Redis Cache first (Fastest path)
    const cachedRedis = await Cache.get(redisKey);
    if (cachedRedis && Array.isArray(cachedRedis)) {
      return this.paginateRankings(cachedRedis, limit, page);
    }

    // 2. Check RTDB cache
    const cacheRef = realtime.ref(`leaderboards/${cacheKey}`);
    const snapshot = await cacheRef.once("value");
    const cachedData = snapshot.val();

    // Check if RTDB cached data exists and was updated today
    if (cachedData && cachedData.lastUpdated) {
      const todayString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const cacheDateString = new Date(cachedData.lastUpdated)
        .toISOString()
        .split("T")[0];

      if (todayString === cacheDateString && Array.isArray(cachedData.rankings)) {
        // Warm Redis cache for subsequent calls (24 hours TTL)
        await Cache.set(redisKey, cachedData.rankings, 86400);
        return this.paginateRankings(cachedData.rankings, limit, page);
      }
    }

    console.log(`[Leaderboard] Computing new rankings for key: ${cacheKey}`);

    // 3. Compute new rankings from Firestore
    let usersQuery = db.collection("users");

    // Apply exact match filters
    if (filters.role) {
      const roleVariants = Array.from(new Set([
        filters.role,
        filters.role.toLowerCase(),
        filters.role.charAt(0).toUpperCase() + filters.role.slice(1).toLowerCase(),
      ]));
      usersQuery = usersQuery.where("role", "in", roleVariants);
    }
    if (filters.country) {
      usersQuery = usersQuery.where("country", "==", filters.country);
    }
    if (filters.location) {
      usersQuery = usersQuery.where("location", "==", filters.location);
    }
    if (filters.region) {
      usersQuery = usersQuery.where("region", "==", filters.region);
    }

    // Sport array filtering
    if (filters.sport) {
      usersQuery = usersQuery.where(
        "favoriteSports",
        "array-contains",
        filters.sport,
      );
    }

    const querySnapshot = await usersQuery.get();

    let users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        username: userData.username || "",
        name: userData.name || "",
        profilePic: userData.profilePic || "",
        role: userData.role || "",
        country: userData.country || "",
        location: userData.location || "",
        level: userData.level || 0,
        xp: userData.xp || 0,
        score: this.calculateScore(userData),
      });
    });

    // Sort descending by score
    users.sort((a, b) => b.score - a.score);

    // 4. Save to Redis Cache (24-hour TTL)
    await Cache.set(redisKey, users, 86400);

    // 5. Save to RTDB cache in background
    const newDataToCache = {
      lastUpdated: new Date().toISOString(),
      rankings: users,
    };
    cacheRef.set(newDataToCache).catch((e) => {
      console.warn("[Leaderboard] RTDB set warning:", e.message);
    });

    return this.paginateRankings(users, limit, page);
  }

  /**
   * Paginates the array of users.
   */
  static paginateRankings(allRankings, limit, page) {
    const skip = (page - 1) * limit;
    const paginated = allRankings.slice(skip, skip + limit);
    return {
      data: paginated,
      total: allRankings.length,
      page,
      limit,
      totalPages: Math.ceil(allRankings.length / limit) || 1,
    };
  }
}

module.exports = { LeaderboardService };
