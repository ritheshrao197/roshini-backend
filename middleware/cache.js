const redisClient = require("../config/redis");

/**
 * Cache Middleware using Upstash Redis
 * Bypasses automatically if Redis is down or unconfigured.
 * 
 * @param {string} prefix - Key prefix for this route
 * @param {number} ttlSeconds - Time to live in seconds
 */
const cacheMiddleware = (prefix, ttlSeconds) => async (req, res, next) => {
  if (!redisClient) {
    return next(); // Bypass cache
  }

  // Use the full originalUrl for unique caching of paginated/filtered requests
  const key = `roshinis:${prefix}:${req.originalUrl || req.url}`;

  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      const parsedData = typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData;
      return res.json(parsedData);
    }

    // Intercept res.json to cache the response before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300 && body && !body.error) {
          if (typeof redisClient.setex === "function") {
            redisClient.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
          } else {
            redisClient.set(key, JSON.stringify(body), { ex: ttlSeconds }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("[CacheMiddleware] Failed to set cache for key:", key, err.message);
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error("[CacheMiddleware] Cache access error:", err.message);
    next(); // Bypass on error
  }
};

const clearCache = async (prefix) => {
  if (!redisClient || typeof redisClient.keys !== "function") return;
  try {
    const keys = await redisClient.keys(`roshinis:${prefix}:*`);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error("[CacheMiddleware] clearCache error:", err.message);
  }
};

module.exports = {
  cacheMiddleware,
  clearCache
};
