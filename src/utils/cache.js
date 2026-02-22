const { redis, isRedisAvailable } = require("../config/redis");

/* -------------------------------------------------------------
   IN-MEMORY FALLBACK
   Simple Map-based cache for when Redis is offline/missing.
   Does not support TTL expiration logic for simplicity, 
   but prevents app from crashing.
------------------------------------------------------------- */
const memoryCache = new Map();

class Cache {
  /**
   * Get a value from cache
   * @param {string} key
   * @returns {Promise<any>} Parsed JSON or string, or null
   */
  static async get(key) {
    if (isRedisAvailable()) {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        console.warn(`Cache GET error for ${key}:`, err.message);
        return null;
      }
    } else {
      // Fallback
      return memoryCache.get(key) || null;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  static async set(key, value, ttlSeconds = 3600) {
    const stringValue = JSON.stringify(value);

    if (isRedisAvailable()) {
      try {
        await redis.set(key, stringValue, "EX", ttlSeconds);
      } catch (err) {
        console.warn(`Cache SET error for ${key}:`, err.message);
      }
    } else {
      // Fallback
      memoryCache.set(key, JSON.parse(stringValue)); // Store copy to simulate serialization

      // Basic memory cleanup (not perfect TTL)
      setTimeout(() => {
        memoryCache.delete(key);
      }, ttlSeconds * 1000);
    }
  }

  /**
   * Delete a value from cache
   * @param {string} key
   */
  static async del(key) {
    if (isRedisAvailable()) {
      try {
        await redis.del(key);
      } catch (err) {
        console.warn(`Cache DEL error for ${key}:`, err.message);
      }
    } else {
      memoryCache.delete(key);
    }
  }

  /**
   * Flush entire cache (Use with caution)
   */
  static async flush() {
    if (isRedisAvailable()) {
      await redis.flushall();
    } else {
      memoryCache.clear();
    }
  }
}

module.exports = { Cache };
