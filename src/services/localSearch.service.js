const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");
const { Cache } = require("../utils/cache");
const { db } = require("../config/firebase");

const DATA_DIR = path.join(__dirname, "..", "data");

const USER_FUSE_OPTIONS = {
  keys: [
    { name: "username", weight: 0.6 },
    { name: "name", weight: 0.4 },
  ],
  threshold: 0.35,
  distance: 80,
  minMatchCharLength: 3,
  ignoreLocation: true,
  includeScore: true,
};

const POST_FUSE_OPTIONS = {
  keys: [
    { name: "caption", weight: 0.5 },
    { name: "tags", weight: 0.3 },
    { name: "name", weight: 0.2 },
  ],
  threshold: 0.35,
  distance: 80,
  minMatchCharLength: 3,
  ignoreLocation: true,
  includeScore: true,
};

const GAME_FUSE_OPTIONS = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "sport", weight: 0.3 },
    { name: "tags", weight: 0.2 },
  ],
  threshold: 0.35,
  distance: 80,
  minMatchCharLength: 3,
  ignoreLocation: true,
  includeScore: true,
};

class LocalSearchService {
  constructor() {
    this.usersMap = {};
    this.usersArray = [];
    this.usersFuse = null;

    this.postsMap = {};
    this.postsArray = [];
    this.postsFuse = null;

    this.gamesMap = {};
    this.gamesArray = [];
    this.gamesFuse = null;

    this.isInitialized = false;
  }

  /**
   * Initialize all search indices from Redis, fallback disk files, or directly from Firestore.
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

      if (!minUsersMap || Object.keys(minUsersMap).length === 0) {
        // 2. Fallback to disk file
        const filePath = path.join(DATA_DIR, "users_min.json");
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, "utf8");
          minUsersMap = JSON.parse(fileData);
        }
      }

      if (!minUsersMap || Object.keys(minUsersMap).length === 0) {
        // 3. Fallback to Firestore if neither Redis nor disk has data
        console.log("[LocalSearch] Fetching users directly from Firestore...");
        const snapshot = await db.collection("users").get();
        minUsersMap = {};
        snapshot.forEach((doc) => {
          const user = doc.data();
          const minData = {
            id: doc.id,
            username: user.username || "",
            name: user.name || "",
            profilePic: user.profilePic || "",
            role: user.role || "",
            verified: !!user.verified,
          };
          minUsersMap[doc.id] = {
            username: minData.username,
            name: minData.name,
            data: minData,
          };
        });

        // Persist to disk and Redis
        this._saveToDisk("users_min.json", minUsersMap);
        await Cache.set("search:users_min", minUsersMap, 86400);
      }

      if (minUsersMap && typeof minUsersMap === "object") {
        this.usersMap = minUsersMap;
        this.usersArray = Object.values(minUsersMap).map((u) => u.data || u);
        this.usersFuse = new Fuse(this.usersArray, USER_FUSE_OPTIONS);
        console.log(`[LocalSearch] Loaded ${this.usersArray.length} users into search index`);
      }
    } catch (err) {
      console.error("[LocalSearch] Failed to load users index:", err.message);
    }
  }

  /**
   * Instagram-style multi-tiered relevance search for users.
   */
  async searchUsers(query) {
    if (!this.usersArray || this.usersArray.length === 0) {
      await this.loadUsersIndex();
    }
    if (!this.usersArray || this.usersArray.length === 0) {
      return [];
    }

    if (!query || typeof query !== "string") {
      return [];
    }

    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      return [];
    }

    const scored = [];
    const seenIds = new Set();

    for (const user of this.usersArray) {
      const username = (user.username || "").toLowerCase();
      const name = (user.name || "").toLowerCase();
      const wordsInName = name.split(/\s+/).filter(Boolean);
      const initials = wordsInName.map((w) => w[0]).join("");

      let score = 0;

      // 1. Exact Match (Tier 1: 950 - 1000)
      if (username === q) {
        score = 1000;
      } else if (name === q) {
        score = 950;
      }
      // 2. Prefix Matches (Tier 2: 650 - 800)
      else if (username.startsWith(q)) {
        score = 800 - Math.min(100, (username.length - q.length) * 2);
      } else if (name.startsWith(q)) {
        score = 720 - Math.min(100, (name.length - q.length) * 2);
      } else if (wordsInName.some((w) => w.startsWith(q))) {
        const matchedWord = wordsInName.find((w) => w.startsWith(q));
        score = 650 - Math.min(50, (matchedWord.length - q.length) * 2);
      }
      // 3. Acronym / Initials Match (Tier 3: 600)
      else if (initials && initials === q) {
        score = 600;
      }
      // 4. Substring Contains Match (Tier 4: 200 - 450)
      else if (username.includes(q)) {
        const idx = username.indexOf(q);
        score = Math.max(200, 420 - idx * 5 - (username.length - q.length));
      } else if (name.includes(q)) {
        const idx = name.indexOf(q);
        score = Math.max(180, 360 - idx * 5 - (name.length - q.length));
      }

      if (score > 0) {
        // Boosts
        if (user.verified) score += 25;
        if (user.profilePic && user.profilePic.length > 0) score += 10;

        scored.push({ user, score });
        seenIds.add(user.id);
      }
    }

    // 5. Fuzzy / Typo Tolerance (Tier 5: 50 - 150) for queries of 3+ characters
    if (q.length >= 3 && this.usersFuse) {
      const fuzzyResults = this.usersFuse.search(q);
      for (const r of fuzzyResults) {
        if (!seenIds.has(r.item.id)) {
          const fuzzyScore = Math.max(20, Math.round((1 - (r.score || 0)) * 140));
          scored.push({ user: r.item, score: fuzzyScore });
          seenIds.add(r.item.id);
        }
      }
    }

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.user);
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

      if (!minPostsMap || Object.keys(minPostsMap).length === 0) {
        const filePath = path.join(DATA_DIR, "posts_min.json");
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, "utf8");
          minPostsMap = JSON.parse(fileData);
        }
      }

      if (!minPostsMap || Object.keys(minPostsMap).length === 0) {
        console.log("[LocalSearch] Fetching posts directly from Firestore...");
        const snapshot = await db.collection("posts").get();
        minPostsMap = {};
        snapshot.forEach((doc) => {
          const post = doc.data();
          const minData = {
            id: doc.id,
            userId: post.userId || "",
            type: post.type || "",
            caption: post.data?.caption || post.caption || "",
            tags: Array.isArray(post.tags)
              ? post.tags
              : typeof post.tags === "string"
              ? post.tags.split(",").map((t) => t.trim())
              : [],
            pic: post.userInfo?.pic || post.pic || "",
            name: post.userInfo?.name || post.name || "",
          };
          minPostsMap[doc.id] = {
            caption: minData.caption,
            tags: minData.tags,
            data: minData,
          };
        });

        this._saveToDisk("posts_min.json", minPostsMap);
        await Cache.set("search:posts_min", minPostsMap, 86400);
      }

      if (minPostsMap && typeof minPostsMap === "object") {
        this.postsMap = minPostsMap;
        this.postsArray = Object.values(minPostsMap).map((p) => p.data || p);
        this.postsFuse = new Fuse(this.postsArray, POST_FUSE_OPTIONS);
        console.log(`[LocalSearch] Loaded ${this.postsArray.length} posts into search index`);
      }
    } catch (err) {
      console.error("[LocalSearch] Failed to load posts index:", err.message);
    }
  }

  async searchPosts(query) {
    if (!this.postsArray || this.postsArray.length === 0) {
      await this.loadPostsIndex();
    }
    if (!this.postsArray || this.postsArray.length === 0) {
      return [];
    }

    if (!query || typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    const scored = [];
    const seenIds = new Set();

    for (const post of this.postsArray) {
      const caption = (post.caption || "").toLowerCase();
      const name = (post.name || "").toLowerCase();
      const tags = Array.isArray(post.tags) ? post.tags.map((t) => String(t).toLowerCase()) : [];

      let score = 0;

      // 1. Exact / Prefix Match on Tags
      if (tags.some((t) => t === q || `#${t}` === q)) {
        score = 900;
      } else if (tags.some((t) => t.startsWith(q))) {
        score = 800;
      }
      // 2. Caption exact / prefix / word start
      else if (caption === q) {
        score = 850;
      } else if (caption.startsWith(q)) {
        score = 750;
      } else if (caption.split(/\s+/).some((w) => w.startsWith(q))) {
        score = 650;
      }
      // 3. Author Name match
      else if (name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))) {
        score = 550;
      }
      // 4. Substring Contains
      else if (caption.includes(q)) {
        score = 400;
      } else if (tags.some((t) => t.includes(q))) {
        score = 350;
      }

      if (score > 0) {
        scored.push({ post, score });
        seenIds.add(post.id);
      }
    }

    // 5. Fuzzy matching for typos (queries >= 3 chars)
    if (q.length >= 3 && this.postsFuse) {
      const fuzzyResults = this.postsFuse.search(q);
      for (const r of fuzzyResults) {
        if (!seenIds.has(r.item.id)) {
          const fuzzyScore = Math.max(20, Math.round((1 - (r.score || 0)) * 140));
          scored.push({ post: r.item, score: fuzzyScore });
          seenIds.add(r.item.id);
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.post);
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

      if (!minGamesMap || Object.keys(minGamesMap).length === 0) {
        const filePath = path.join(DATA_DIR, "games_min.json");
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, "utf8");
          minGamesMap = JSON.parse(fileData);
        }
      }

      if (!minGamesMap || Object.keys(minGamesMap).length === 0) {
        console.log("[LocalSearch] Fetching games directly from Firestore...");
        const snapshot = await db.collection("events").where("type", "==", "game").get();
        minGamesMap = {};
        snapshot.forEach((doc) => {
          const game = doc.data();
          const minData = {
            id: doc.id,
            userId: game.userId || "",
            sport: game.sport || game.data?.sport || "",
            title: game.title || "",
            date: game.date || game.data?.date || null,
            location: game.location || game.data?.location || "",
            tags: Array.isArray(game.tags)
              ? game.tags
              : typeof game.tags === "string"
              ? game.tags.split(",").map((t) => t.trim())
              : Array.isArray(game.data?.tags)
              ? game.data.tags
              : typeof game.data?.tags === "string"
              ? game.data.tags.split(",").map((t) => t.trim())
              : [],
            type: "game",
          };
          minGamesMap[doc.id] = {
            title: minData.title,
            sport: minData.sport,
            tags: minData.tags,
            data: minData,
          };
        });

        this._saveToDisk("games_min.json", minGamesMap);
        await Cache.set("search:games_min", minGamesMap, 86400);
      }

      if (minGamesMap && typeof minGamesMap === "object") {
        this.gamesMap = minGamesMap;
        this.gamesArray = Object.values(minGamesMap).map((g) => g.data || g);
        this.gamesFuse = new Fuse(this.gamesArray, GAME_FUSE_OPTIONS);
        console.log(`[LocalSearch] Loaded ${this.gamesArray.length} games into search index`);
      }
    } catch (err) {
      console.error("[LocalSearch] Failed to load games index:", err.message);
    }
  }

  async searchGames(query) {
    if (!this.gamesArray || this.gamesArray.length === 0) {
      await this.loadGamesIndex();
    }
    if (!this.gamesArray || this.gamesArray.length === 0) {
      return [];
    }

    if (!query || typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    const scored = [];
    const seenIds = new Set();

    for (const game of this.gamesArray) {
      const title = (game.title || "").toLowerCase();
      const sport = (game.sport || "").toLowerCase();
      const tags = Array.isArray(game.tags) ? game.tags.map((t) => String(t).toLowerCase()) : [];

      let score = 0;

      // 1. Exact matches
      if (title === q) {
        score = 950;
      } else if (sport === q) {
        score = 900;
      }
      // 2. Prefix matches
      else if (title.startsWith(q)) {
        score = 800;
      } else if (sport.startsWith(q)) {
        score = 750;
      } else if (title.split(/\s+/).some((w) => w.startsWith(q))) {
        score = 700;
      } else if (tags.some((t) => t.startsWith(q))) {
        score = 650;
      }
      // 3. Substring contains
      else if (title.includes(q)) {
        score = 450;
      } else if (sport.includes(q)) {
        score = 400;
      } else if (tags.some((t) => t.includes(q))) {
        score = 350;
      }

      if (score > 0) {
        scored.push({ game, score });
        seenIds.add(game.id);
      }
    }

    // 4. Fuzzy match for typos (queries >= 3 chars)
    if (q.length >= 3 && this.gamesFuse) {
      const fuzzyResults = this.gamesFuse.search(q);
      for (const r of fuzzyResults) {
        if (!seenIds.has(r.item.id)) {
          const fuzzyScore = Math.max(20, Math.round((1 - (r.score || 0)) * 140));
          scored.push({ game: r.item, score: fuzzyScore });
          seenIds.add(r.item.id);
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.game);
  }

  /* -------------------------------------------------------------
     REAL-TIME UPSERTS & REMOVALS
  ------------------------------------------------------------- */
  async upsertUser(userId, userData) {
    if (!userId) return;
    const minData = {
      id: userId,
      username: userData.username || "",
      name: userData.name || "",
      profilePic: userData.profilePic || "",
      role: userData.role || "",
      verified: !!userData.verified,
    };

    this.usersMap[userId] = {
      username: minData.username,
      name: minData.name,
      data: minData,
    };

    this.usersArray = Object.values(this.usersMap).map((u) => u.data || u);
    this.usersFuse = new Fuse(this.usersArray, USER_FUSE_OPTIONS);

    this._saveToDisk("users_min.json", this.usersMap);
    await Cache.set("search:users_min", this.usersMap, 86400);
  }

  async removeUser(userId) {
    if (!userId || !this.usersMap[userId]) return;
    delete this.usersMap[userId];
    this.usersArray = Object.values(this.usersMap).map((u) => u.data || u);
    this.usersFuse = new Fuse(this.usersArray, USER_FUSE_OPTIONS);

    this._saveToDisk("users_min.json", this.usersMap);
    await Cache.set("search:users_min", this.usersMap, 86400);
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

  _saveToDisk(fileName, data) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.warn(`[LocalSearch] Failed to write ${fileName} to disk:`, err.message);
    }
  }
}

// Export singleton instance
const localSearchService = new LocalSearchService();
localSearchService.initialize().catch((err) => {
  console.warn("[LocalSearch] Initial background load error:", err.message);
});

module.exports = localSearchService;
