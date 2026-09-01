const { db } = require("../config/firebase");
const { Cache } = require("../utils/cache");

const TYPE_CONFIG = {
  users: {
    collection: "users",
    keyPrefix: "user:profile:",
    ttl: 3600, // 1 hour
  },
  posts: {
    collection: "posts",
    keyPrefix: "post:",
    ttl: 3600, // 1 hour
  },
  events: {
    collection: "events",
    keyPrefix: "event:",
    ttl: 3600, // 1 hour
  },
  games: {
    collection: "events",
    keyPrefix: "event:",
    ttl: 3600, // 1 hour
  },
};

class BatchService {
  /**
   * Batch fetch items of a specific type (users, posts, events, games).
   * Checks Redis first for each ID; fetches only missing IDs from Firestore and caches them.
   *
   * @param {string} type - 'users' | 'posts' | 'events' | 'games'
   * @param {string[]} ids - Array of document IDs
   * @returns {Promise<{data: Array, totalRequested: number, foundCount: number, cachedCount: number, fetchedFromDbCount: number}>}
   */
  static async fetchBatch(type, ids = []) {
    const config = TYPE_CONFIG[type.toLowerCase()];
    if (!config) {
      throw new Error(`Unsupported batch type: '${type}'. Supported types: users, posts, events, games`);
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        data: [],
        totalRequested: 0,
        foundCount: 0,
        cachedCount: 0,
        fetchedFromDbCount: 0,
      };
    }

    // Clean and deduplicate IDs
    const uniqueIds = Array.from(new Set(ids.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return {
        data: [],
        totalRequested: 0,
        foundCount: 0,
        cachedCount: 0,
        fetchedFromDbCount: 0,
      };
    }

    const resultsMap = new Map();
    const missingIds = [];

    // 1. Parallel Redis Cache Lookup
    await Promise.all(
      uniqueIds.map(async (id) => {
        const cacheKey = `${config.keyPrefix}${id}`;
        try {
          const cached = await Cache.get(cacheKey);
          if (cached) {
            resultsMap.set(id, cached);
          } else {
            missingIds.push(id);
          }
        } catch {
          missingIds.push(id);
        }
      })
    );

    // 2. Fetch missing IDs from Firestore in chunks (up to 50 at a time)
    if (missingIds.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < missingIds.length; i += chunkSize) {
        const chunk = missingIds.slice(i, i + chunkSize);
        try {
          const docRefs = chunk.map((id) => db.collection(config.collection).doc(id));
          const docs = await db.getAll(...docRefs);

          const cachingPromises = [];
          for (const doc of docs) {
            if (doc.exists) {
              const data = { id: doc.id, ...doc.data() };
              resultsMap.set(doc.id, data);

              // 3. Cache newly fetched doc into Redis
              const cacheKey = `${config.keyPrefix}${doc.id}`;
              cachingPromises.push(Cache.set(cacheKey, data, config.ttl));
            }
          }
          await Promise.all(cachingPromises);
        } catch (dbErr) {
          console.error(`[BatchService] Error fetching ${type} batch chunk from Firestore:`, dbErr.message);
        }
      }
    }

    // 3. Assemble results preserving requested order
    const data = uniqueIds
      .map((id) => resultsMap.get(id))
      .filter((item) => item !== undefined);

    const cachedCount = uniqueIds.length - missingIds.length;
    const fetchedFromDbCount = missingIds.length;

    return {
      data,
      totalRequested: uniqueIds.length,
      foundCount: data.length,
      cachedCount,
      fetchedFromDbCount,
    };
  }

  /**
   * Multi-entity batch fetch (fetch users, posts, events in one call).
   * @param {Object} batchRequest - e.g. { users: [...], posts: [...], events: [...] }
   */
  static async fetchMultiBatch(batchRequest = {}) {
    const supportedKeys = Object.keys(TYPE_CONFIG);
    const keysToProcess = Object.keys(batchRequest).filter((k) => supportedKeys.includes(k.toLowerCase()));

    const result = {};
    let totalCached = 0;
    let totalDb = 0;

    await Promise.all(
      keysToProcess.map(async (key) => {
        const ids = batchRequest[key];
        const res = await this.fetchBatch(key, ids);
        result[key] = res.data;
        totalCached += res.cachedCount;
        totalDb += res.fetchedFromDbCount;
      })
    );

    return {
      data: result,
      cachedCount: totalCached,
      fetchedFromDbCount: totalDb,
    };
  }
}

module.exports = BatchService;
