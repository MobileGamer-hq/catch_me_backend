const { Firestore } = require("../utils/db");

class GraphService {
  /**
   * Find "You May Know" users based on mutual connections
   * Logic: Users followed by people I follow, excluding people I already follow.
   */
  static async getYouMayKnow(userId, limit = 10) {
    try {
      const user = await Firestore.getById("users", userId);
      if (!user || !user.following || user.following.length === 0) {
        return [];
      }

      const myFollowing = new Set(user.following);
      const candidates = new Map(); // userId -> score (mutual count)

      // 1. Get users I follow
      // Limit to top 20 to avoid explosion
      const seeds = user.following.slice(0, 20);
      const seedDocs = await Firestore.getByIds("users", seeds);

      for (const seed of seedDocs) {
        if (!seed.following) continue;

        for (const candidateId of seed.following) {
          // Skip if I already follow them or it's me
          if (myFollowing.has(candidateId) || candidateId === userId) {
            continue;
          }

          const score = (candidates.get(candidateId) || 0) + 1;
          candidates.set(candidateId, score);
        }
      }

      // 2. Sort candidates by score (mutual count)
      const sortedCandidates = [...candidates.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map((entry) => entry[0]);

      if (sortedCandidates.length === 0) return [];

      // 3. Hydrate user details
      const suggestions = await Firestore.getByIds("users", sortedCandidates);

      return suggestions.map((u) => ({
      id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        mutualCount: candidates.get(u.id),
      }));
    } catch (error) {
      console.error("GraphService Error:", error);
      return [];
    }
  }
}

module.exports = { GraphService };
