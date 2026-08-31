const { redis, isRedisAvailable } = require("../config/redis");

/* -------------------------------------------------------------
   IN-MEMORY FALLBACK STORES
   Map-based stores for when Redis is offline/unreachable.
------------------------------------------------------------- */
const memoryCache = new Map();
const memoryCacheExpiry = new Map();
const memoryHashes = new Map();

class Cache {
  /**
   * Get a value from cache
   * @param {string} key
   * @returns {Promise<any>} Parsed JSON or raw value, or null
   */
  static async get(key) {
    if (isRedisAvailable() && redis) {
      try {
        const data = await redis.get(key);
        if (!data) return null;
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      } catch (err) {
        console.warn(`Cache GET error for ${key}:`, err.message);
      }
    }

    // In-memory fallback
    const expiry = memoryCacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
      return null;
    }
    return memoryCache.get(key) ?? null;
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  static async set(key, value, ttlSeconds = 3600) {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);

    if (isRedisAvailable() && redis) {
      try {
        if (ttlSeconds > 0) {
          await redis.set(key, stringValue, "EX", ttlSeconds);
        } else {
          await redis.set(key, stringValue);
        }
        return true;
      } catch (err) {
        console.warn(`Cache SET error for ${key}:`, err.message);
      }
    }

    // In-memory fallback
    memoryCache.set(key, typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value);
    if (ttlSeconds > 0) {
      memoryCacheExpiry.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key
   */
  static async del(key) {
    if (isRedisAvailable() && redis) {
      try {
        await redis.del(key);
        return true;
      } catch (err) {
        console.warn(`Cache DEL error for ${key}:`, err.message);
      }
    }

    memoryCache.delete(key);
    memoryCacheExpiry.delete(key);
    memoryHashes.delete(key);
    return true;
  }

  /* -------------------------------------------------------------
     HASH OPERATIONS (Buffers for Views, Engagements, etc.)
  ------------------------------------------------------------- */

  /**
   * Increment a field in a hash by amount
   * @param {string} hashKey e.g. 'buffer:views' or 'buffer:engagements'
   * @param {string} field e.g. 'post_123'
   * @param {number} amount
   * @returns {Promise<number>} New field value
   */
  static async hincrby(hashKey, field, amount = 1) {
    if (isRedisAvailable() && redis) {
      try {
        return await redis.hincrby(hashKey, field, amount);
      } catch (err) {
        console.warn(`Cache HINCRBY error for ${hashKey} [${field}]:`, err.message);
      }
    }

    // In-memory fallback
    if (!memoryHashes.has(hashKey)) {
      memoryHashes.set(hashKey, {});
    }
    const hash = memoryHashes.get(hashKey);
    const currentVal = parseInt(hash[field], 10) || 0;
    const newVal = currentVal + amount;
    hash[field] = newVal;
    return newVal;
  }

  /**
   * Get a single field value from a hash
   * @param {string} hashKey
   * @param {string} field
   * @returns {Promise<string|null>}
   */
  static async hget(hashKey, field) {
    if (isRedisAvailable() && redis) {
      try {
        return await redis.hget(hashKey, field);
      } catch (err) {
        console.warn(`Cache HGET error for ${hashKey} [${field}]:`, err.message);
      }
    }

    const hash = memoryHashes.get(hashKey) || {};
    return hash[field] !== undefined ? String(hash[field]) : null;
  }

  /**
   * Get all fields and values from a hash
   * @param {string} hashKey
   * @returns {Promise<Object>}
   */
  static async hgetall(hashKey) {
    if (isRedisAvailable() && redis) {
      try {
        return (await redis.hgetall(hashKey)) || {};
      } catch (err) {
        console.warn(`Cache HGETALL error for ${hashKey}:`, err.message);
      }
    }

    return { ...(memoryHashes.get(hashKey) || {}) };
  }

  /**
   * Delete one or more fields from a hash
   * @param {string} hashKey
   * @param  {...string} fields
   */
  static async hdel(hashKey, ...fields) {
    if (isRedisAvailable() && redis) {
      try {
        return await redis.hdel(hashKey, ...fields);
      } catch (err) {
        console.warn(`Cache HDEL error for ${hashKey}:`, err.message);
      }
    }

    const hash = memoryHashes.get(hashKey) || {};
    for (const field of fields) {
      delete hash[field];
    }
    return true;
  }

  /* -------------------------------------------------------------
     SORTED SET OPERATIONS (Leaderboards)
  ------------------------------------------------------------- */

  /**
   * Add members with scores to a sorted set
   * @param {string} key
   * @param {number} score
   * @param {string} member
   */
  static async zadd(key, score, member) {
    if (isRedisAvailable() && redis) {
      try {
        return await redis.zadd(key, score, member);
      } catch (err) {
        console.warn(`Cache ZADD error for ${key}:`, err.message);
      }
    }
    return false;
  }

  /**
   * Flush entire cache (Caution)
   */
  static async flush() {
    if (isRedisAvailable() && redis) {
      try {
        await redis.flushall();
      } catch (err) {
        console.warn("Cache FLUSH error:", err.message);
      }
    }
    memoryCache.clear();
    memoryCacheExpiry.clear();
    memoryHashes.clear();
  }
}

module.exports = { Cache };
