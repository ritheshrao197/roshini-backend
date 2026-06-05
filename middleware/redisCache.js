const redis = require("redis");

let redisClient = null;
let useLocalCache = true;
const localCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Initialize Redis if credentials exist, else fallback to memory
if (process.env.REDIS_URL) {
  try {
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => {
      console.warn("Redis connection failed, falling back to local memory cache.", err);
      useLocalCache = true;
    });
    redisClient.connect().then(() => {
      console.log("==============Redis Cache Connected Successfully==============");
      useLocalCache = false;
    });
  } catch (e) {
    console.warn("Failed to initialize Redis client, using local cache fallback.");
    useLocalCache = true;
  }
}

exports.cacheMiddleware = async (req, res, next) => {
  // Only cache GET requests
  if (req.method !== "GET") {
    return next();
  }

  const key = `cache:${req.originalUrl || req.url}`;

  try {
    if (!useLocalCache && redisClient && redisClient.isOpen) {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        res.setHeader("X-Cache", "HIT-REDIS");
        return res.json(JSON.parse(cachedData));
      }
    } else {
      const cached = localCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.setHeader("X-Cache", "HIT-MEMORY");
        return res.json(cached.data);
      }
    }
  } catch (err) {
    console.error("Cache read error:", err);
  }

  // Intercept the res.json method to store response in cache before sending
  const originalJson = res.json;
  res.json = function (body) {
    res.json = originalJson;
    
    try {
      if (!useLocalCache && redisClient && redisClient.isOpen) {
        redisClient.setEx(key, 300, JSON.stringify(body)); // 5 minutes TTL
      } else {
        localCache.set(key, {
          data: body,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error("Cache write error:", err);
    }
    
    return originalJson.call(this, body);
  };

  res.setHeader("X-Cache", "MISS");
  next();
};

// Helper to clear cache on mutations
exports.clearCache = async (pattern) => {
  try {
    if (!useLocalCache && redisClient && redisClient.isOpen) {
      const keys = await redisClient.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      for (const key of localCache.keys()) {
        if (key.includes(pattern)) {
          localCache.delete(key);
        }
      }
    }
  } catch (err) {
    console.error("Cache purge error:", err);
  }
};
