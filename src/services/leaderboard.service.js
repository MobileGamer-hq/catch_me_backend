const { db, realtime } = require("../config/firebase");

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
   * Fetches and ranks users based on filters, utilizing RTDB as a daily cache.
   * @param {Object} filters Query parameters like role, country, sport, etc.
   * @param {number} limit Max number of results.
   * @param {number} page Page number for pagination.
   * @returns {Promise<Object>} The ranked users and total count.
   */
  static async getRankings(filters = {}, limit = 50, page = 1) {
    const cacheKey = this.generateCacheKey(filters);
    const cacheRef = realtime.ref(`leaderboards/${cacheKey}`);

    // Check cache
    const snapshot = await cacheRef.once("value");
    const cachedData = snapshot.val();

    // Check if cached data exists and was updated today
    if (cachedData && cachedData.lastUpdated) {
      const todayString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const cacheDateString = new Date(cachedData.lastUpdated)
        .toISOString()
        .split("T")[0];

      if (todayString === cacheDateString && cachedData.rankings) {
        console.log(`[Leaderboard] Returning cached data for key: ${cacheKey}`);
        return this.paginateRankings(cachedData.rankings, limit, page);
      }
    }

    console.log(`[Leaderboard] Computing new rankings for key: ${cacheKey}`);

    // If no valid cache, compute new rankings from Firestore
    let usersQuery = db.collection("users");

    // Apply exact match filters
    if (filters.role) {
      usersQuery = usersQuery.where("role", "==", filters.role);
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
      // Assuming we want to check both arrays, but Firestore doesn't support multiple array-contains.
      // We will check favoriteSports. Alternative: filter after fetching.
      // To keep it performant, we use array-contains on one field.
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
      // Calculate score and add ID
      users.push({
        id: doc.id,
        username: userData.username,
        name: userData.name,
        profilePic: userData.profilePic,
        role: userData.role,
        country: userData.country,
        location: userData.location,
        level: userData.level,
        xp: userData.xp,
        score: this.calculateScore(userData),
      });
    });

    // Sort descending by score
    users.sort((a, b) => b.score - a.score);

    // Save to RTDB cache
    const newDataToCache = {
      lastUpdated: new Date().toISOString(),
      rankings: users,
    };

    await cacheRef.set(newDataToCache);

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
