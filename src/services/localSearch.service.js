const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");
const { Cache } = require("../utils/cache");

const DATA_DIR = path.join(__dirname, "..", "data");

const USER_FUSE_OPTIONS = {
  keys: ["name", "username"],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
};

const POST_FUSE_OPTIONS = {
  keys: ["caption", "tags"],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
};

const GAME_FUSE_OPTIONS = {
  keys: ["title", "sport", "tags"],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
};

class LocalSearchService {
  constructor() {
    this.usersFuse = null;
    this.postsFuse = null;
    this.gamesFuse = null;
    this.isInitialized = false;
  }

  /**
   * Initialize all search indices from Redis or fallback disk files.
   */
  async initialize() {
    if (this.isInitialized) return;
    await Promise.all([
      this.loadUsersIndex(),
      this.loadPostsIndex(),
      this.loadGamesIndex(),
    ]);
    this.isInitialized = true;
  }

  /* -------------------------------------------------------------
     USERS SEARCH INDEX
  ------------------------------------------------------------- */
  async loadUsersIndex(dataMap = null) {
    try {
      let minUsersMap = dataMap;

      if (!minUsersMap) {
        // 1. Try reading from Redis
        minUsersMap = await Cache.get("search:users_min");
      }

      if (!minUsersMap) {
        // 2. Fallback to disk file
        const filePath = path.join(DATA_DIR, "users_min.json");
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, "utf8");
          minUsersMap = JSON.parse(fileData);
          // Populate Redis for other instances
          await Cache.set("search:users_min", minUsersMap, 86400);
        }
      }

      if (minUsersMap && typeof minUsersMap === "object") {
        const usersArray = Object.values(minUsersMap).map((u) => u.data || u);
        this.usersFuse = new Fuse(usersArray, USER_FUSE_OPTIONS);
        console.log(`[LocalSearch] Loaded ${usersArray.length} users into Fuse index`);
      }
    } catch (err) {
      console.error("[LocalSearch] Failed to load users index:", err.message);
    }
  }

  async searchUsers(query) {
    if (!this.usersFuse) {
      await this.loadUsersIndex();
    }
    if (!this.usersFuse) {
      return null; // Not ready
    }
    const results = this.usersFuse.search(query);
    return results.map((r) => r.item);
  }

  /* -------------------------------------------------------------
     POSTS SEARCH INDEX
  ------------------------------------------------------------- */
  async loadPostsIndex(dataMap = null) {
    try {
      let minPostsMap = dataMap;

      if (!minPostsMap) {
        minPostsMap = await Cache.get("search:posts_min");
      }

      if (!minPostsMap) {
        const filePath = path.join(DATA_DIR, "posts_min.json");
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, "utf8");
          minPostsMap = JSON.parse(fileData);
          await Cache.set("search:posts_min", minPostsMap, 86400);
        }
      }

      if (minPostsMap && typeof minPostsMap === "object") {
        const postsArray = Object.values(minPostsMap).map((p) => p.data || p);
        this.postsFuse = new Fuse(postsArray, POST_FUSE_OPTIONS);
        console.log(`[LocalSearch] Loaded ${postsArray.length} posts into Fuse index`);
      }
    } catch (err) {
      console.error("[LocalSearch] Failed to load posts index:", err.message);
    }
  }

  async searchPosts(query) {
    if (!this.postsFuse) {
      await this.loadPostsIndex();
    }
    if (!this.postsFuse) {
      return null;
    }
    const results = this.postsFuse.search(query);
    return results.map((r) => r.item);
  }

  /* -------------------------------------------------------------
     GAMES SEARCH INDEX
  ------------------------------------------------------------- */
  async loadGamesIndex(dataMap = null) {
    try {
      let minGamesMap = dataMap;

      if (!minGamesMap) {
        minGamesMap = await Cache.get("search:games_min");
      }

      if (!minGamesMap) {
        const filePath = path.join(DATA_DIR, "games_min.json");
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, "utf8");
          minGamesMap = JSON.parse(fileData);
          await Cache.set("search:games_min", minGamesMap, 86400);
        }
      }

      if (minGamesMap && typeof minGamesMap === "object") {
        const gamesArray = Object.values(minGamesMap).map((g) => g.data || g);
        this.gamesFuse = new Fuse(gamesArray, GAME_FUSE_OPTIONS);
        console.log(`[LocalSearch] Loaded ${gamesArray.length} games into Fuse index`);
      }
    } catch (err) {
      console.error("[LocalSearch] Failed to load games index:", err.message);
    }
  }

  async searchGames(query) {
    if (!this.gamesFuse) {
      await this.loadGamesIndex();
    }
    if (!this.gamesFuse) {
      return null;
    }
    const results = this.gamesFuse.search(query);
    return results.map((r) => r.item);
  }

  /* -------------------------------------------------------------
     HOT-RELOAD AFTER CRON JOBS
  ------------------------------------------------------------- */
  async reloadUsers(minifiedData) {
    await Cache.set("search:users_min", minifiedData, 86400);
    await this.loadUsersIndex(minifiedData);
  }

  async reloadPosts(minifiedData) {
    await Cache.set("search:posts_min", minifiedData, 86400);
    await this.loadPostsIndex(minifiedData);
  }

  async reloadGames(minifiedData) {
    await Cache.set("search:games_min", minifiedData, 86400);
    await this.loadGamesIndex(minifiedData);
  }
}

// Export singleton instance
const localSearchService = new LocalSearchService();
// Auto-initialize in background on server load
localSearchService.initialize().catch((err) => {
  console.warn("[LocalSearch] Initial background load error:", err.message);
});

module.exports = localSearchService;
