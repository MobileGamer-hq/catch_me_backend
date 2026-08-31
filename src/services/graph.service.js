const { Firestore } = require("../utils/db");
const { db } = require("../config/firebase");
const { Cache } = require("../utils/cache");

const GLOBAL_FEATURED_KEY = "suggestions:top_athletes_and_teams";
const GLOBAL_FEATURED_TTL = 6 * 60 * 60; // 6 hours

class GraphService {
  /**
   * Fetch top athletes and teams from Redis cache or Firestore.
   * Cached globally for 6 hours.
   */
  static async getTopAthletesAndTeams(limit = 20) {
    try {
      // 1. Check Global Redis Cache
      const cached = await Cache.get(GLOBAL_FEATURED_KEY);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }

      console.log("[GraphService] Fetching top athletes and teams from Firestore...");

      // 2. Fetch top athletes
      const athleteRoles = ["Athlete", "athlete"];
      const teamRoles = ["Team", "team", "League", "league"];

      const [athletesSnap, teamsSnap] = await Promise.all([
        db.collection("users").where("role", "in", athleteRoles).limit(20).get(),
        db.collection("users").where("role", "in", teamRoles).limit(20).get(),
      ]);

      const featuredList = [];

      athletesSnap.forEach((doc) => {
        const u = doc.data();
        featuredList.push({
          id: doc.id,
          name: u.name || u.username || "",
          username: u.username || "",
          avatar: u.profilePic || u.avatar || "",
          role: u.role || "Athlete",
          mutualCount: 0,
          isFeatured: true,
          followersCount: Array.isArray(u.followers) ? u.followers.length : 0,
          xp: u.xp || 0,
        });
      });

      teamsSnap.forEach((doc) => {
        const u = doc.data();
        featuredList.push({
          id: doc.id,
          name: u.name || u.username || "",
          username: u.username || "",
          avatar: u.profilePic || u.avatar || "",
          role: u.role || "Team",
          mutualCount: 0,
          isFeatured: true,
          followersCount: Array.isArray(u.followers) ? u.followers.length : 0,
          xp: u.xp || 0,
        });
      });

      // Sort by followers count or XP
      featuredList.sort((a, b) => (b.followersCount + b.xp) - (a.followersCount + a.xp));

      const finalFeatured = featuredList.slice(0, limit);

      // 3. Cache globally in Redis
      if (finalFeatured.length > 0) {
        await Cache.set(GLOBAL_FEATURED_KEY, finalFeatured, GLOBAL_FEATURED_TTL);
      }

      return finalFeatured;
    } catch (err) {
      console.error("[GraphService] Failed to fetch top athletes/teams:", err.message);
      return [];
    }
  }

  /**
   * Find "You May Know" users based on mutual connections.
   * For users with 0 followers/following or no mutuals, falls back to top athletes and teams.
   * Cached per user in Redis with 1-hour TTL.
   */
  static async getYouMayKnow(userId, limit = 10) {
    try {
      const cacheKey = `suggestions:${userId}:${limit}`;

      // 1. Check User Redis Cache
      const cached = await Cache.get(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }

      // 2. Fetch user from Firestore
      const user = await Firestore.getById("users", userId);
      const following = user?.following || [];
      const myFollowing = new Set(following);

      let result = [];

      // 3. If user follows people, attempt mutual graph traversal
      if (following.length > 0) {
        const candidates = new Map(); // userId -> score (mutual count)
        const seeds = following.slice(0, 20); // Top 20 seeds
        const seedDocs = await Firestore.getByIds("users", seeds);

        for (const seed of seedDocs) {
          if (!seed.following) continue;

          for (const candidateId of seed.following) {
            if (myFollowing.has(candidateId) || candidateId === userId) {
              continue;
            }
            const score = (candidates.get(candidateId) || 0) + 1;
            candidates.set(candidateId, score);
          }
        }

        const sortedCandidates = [...candidates.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map((entry) => entry[0]);

        if (sortedCandidates.length > 0) {
          const suggestions = await Firestore.getByIds("users", sortedCandidates);
          result = suggestions.map((u) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatar: u.avatar || u.profilePic || "",
            role: u.role || "",
            mutualCount: candidates.get(u.id) || 1,
          }));
        }
      }

      // 4. Fallback for users with 0 followers/following or no mutual connections:
      // Return top athletes and teams from Redis cache!
      if (result.length === 0) {
        const topFeatured = await this.getTopAthletesAndTeams(limit * 2);
        result = topFeatured
          .filter((f) => f.id !== userId && !myFollowing.has(f.id))
          .slice(0, limit);
      }

      // 5. Save user suggestions to Redis Cache (1 hour TTL)
      if (result.length > 0) {
        await Cache.set(cacheKey, result, 3600);
      }

      return result;
    } catch (error) {
      console.error("GraphService Error:", error);
      return [];
    }
  }
}

module.exports = { GraphService };
