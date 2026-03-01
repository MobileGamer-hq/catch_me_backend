const { Firestore, Realtime } = require("../utils/db");

class TagService {
  /**
   * Aggregates tags from users, posts, and games in Firestore and syncs to RTDB.
   */
  static async syncTags() {
    console.log("Starting tag synchronization...");
    try {
      const tagMap = {
        users: {},
        posts: {},
        games: {},
        all: {}, // Global mapping of tag -> { userIds, postIds, gameIds }
      };

      // 1. Fetch Users
      const users = await Firestore.getAll("users");
      users.forEach((user) => {
        const tags = this.extractTags(user);
        tags.forEach((tag) => {
          this.addToMap(tagMap, "users", tag, user.id);
          this.addToGlobalMap(tagMap, tag, "users", user.id);
        });
      });

      // 2. Fetch Posts
      const posts = await Firestore.getAll("posts");
      posts.forEach((post) => {
        const tags = this.extractTags(post);
        tags.forEach((tag) => {
          this.addToMap(tagMap, "posts", tag, post.id);
          this.addToGlobalMap(tagMap, tag, "posts", post.id);
        });
      });

      // 3. Fetch Games
      const gamesSnapshot = await Firestore.firestore()
        .collection("events")
        .where("type", "==", "game")
        .get();

      gamesSnapshot.forEach((doc) => {
        const game = { id: doc.id, ...doc.data() };
        const tags = this.extractTags(game);
        tags.forEach((tag) => {
          this.addToMap(tagMap, "games", tag, game.id);
          this.addToGlobalMap(tagMap, tag, "games", game.id);
        });
      });

      // 4. Update Realtime Database
      // We'll save the "all" mapping which is the most comprehensive
      await Realtime.set("tags", tagMap.all);

      console.log("Tag synchronization completed successfully.");
      return { success: true, tagsCount: Object.keys(tagMap.all).length };
    } catch (error) {
      console.error("Tag synchronization failed:", error);
      throw error;
    }
  }

  /**
   * Extracts and normalizes tags from an entity.
   */
  static extractTags(entity) {
    let tags = [];
    if (Array.isArray(entity.tags)) {
      tags = entity.tags;
    } else if (typeof entity.tags === "string" && entity.tags.trim() !== "") {
      // Handle comma-separated strings if they exist
      tags = entity.tags.split(",").map((t) => t.trim());
    }

    // Also include interestedTags for users
    if (Array.isArray(entity.interestedTags)) {
      tags = [...tags, ...entity.interestedTags];
    }

    // Normalize: lowercase, trim, unique
    return [
      ...new Set(
        tags
          .filter((t) => typeof t === "string" && t.length > 0)
          .map((t) => t.toLowerCase().trim()),
      ),
    ];
  }

  /**
   * Helper to add an ID to a specific category in the tag map.
   */
  static addToMap(map, category, tag, id) {
    if (!map[category][tag]) {
      map[category][tag] = [];
    }
    if (!map[category][tag].includes(id)) {
      map[category][tag].push(id);
    }
  }

  /**
   * Helper to add an ID to the global tag map.
   */
  static addToGlobalMap(map, tag, category, id) {
    if (!map.all[tag]) {
      map.all[tag] = {
        users: [],
        posts: [],
        games: [],
      };
    }
    if (!map.all[tag][category].includes(id)) {
      map.all[tag][category].push(id);
    }
  }
}

module.exports = TagService;
