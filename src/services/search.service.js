const { db } = require("../config/firebase");
const TagService = require("./tag.service");

class SearchService {
  /**
   * Performs a global search across users, teams, and hashtags.
   * @param {string} query
   * @returns {Promise<Object>}
   */
  static async globalSearch(query) {
    console.log(`[SearchService] Searching for: ${query}`);
    const normalizedQuery = query.toLowerCase().trim();

    try {
      // 1. Search Users (including Teams)
      // Prefix match on username and name
      const userResults = await this.searchUsers(normalizedQuery);

      // 2. Search Hashtags (Tags)
      // We check if the query matches any tags in our system
      const tagResults = await this.searchTags(normalizedQuery);

      return {
        users: userResults.filter(u => u.role !== 'team'),
        teams: userResults.filter(u => u.role === 'team'),
        hashtags: tagResults,
      };
    } catch (error) {
      console.error("[SearchService] Search error:", error);
      throw error;
    }
  }

  /**
   * Basic prefix search for users and teams.
   */
  static async searchUsers(query) {
    const snapshot = await db.collection("users")
      .where("username", ">=", query)
      .where("username", "<=", query + "\uf8ff")
      .limit(20)
      .get();

    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      results.push({
        id: doc.id,
        username: data.username,
        name: data.name,
        profilePic: data.profilePic,
        role: data.role,
        verified: !!data.verified
      });
    });

    // Also check display name for matches if username returned few results
    if (results.length < 10) {
        const nameSnapshot = await db.collection("users")
            .where("name", ">=", query)
            .where("name", "<=", query + "\uf8ff")
            .limit(15)
            .get();
        
        nameSnapshot.forEach(doc => {
            if (!results.find(r => r.id === doc.id)) {
                const data = doc.data();
                results.push({
                    id: doc.id,
                    username: data.username,
                    name: data.name,
                    profilePic: data.profilePic,
                    role: data.role,
                    verified: !!data.verified
                });
            }
        });
    }

    return results;
  }

  /**
   * Search for tags/hashtags.
   */
  static async searchTags(query) {
    // We can query the tags field in posts or use a pre-aggregated tag collection if it exists.
    // For now, we'll use the TagService logic to extract tags from recent posts or users.
    // Better: use a dedicated 'tags' collection or search existing posts.
    
    // Attempt to match query directly against tags in posts
    const postSnapshot = await db.collection("posts")
        .where("tags", "array-contains", query)
        .limit(20)
        .get();

    const matchingPosts = [];
    postSnapshot.forEach(doc => matchingPosts.push({ id: doc.id, ...doc.data() }));

    // Return unique tags that start with the query
    const tagsFound = new Set();
    if (query.startsWith('#')) query = query.slice(1);
    
    matchingPosts.forEach(post => {
        if (Array.isArray(post.tags)) {
            post.tags.forEach(t => {
                if (t.toLowerCase().includes(query)) tagsFound.add(t.toLowerCase());
            });
        }
    });

    return Array.from(tagsFound).map(tag => ({
        name: tag,
        count: 0 // Could potentially calculate usage count
    }));
  }
}

module.exports = SearchService;
