const { Redis } = require("@upstash/redis");

let rawClient = null;
let isDisabled = false;
let disabledUntil = 0;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    rawClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 0, // Fail fast with zero retries when Redis is offline/limit exceeded
      },
    });
    console.log("==============Upstash Redis Client Initialized==============");
  } catch (error) {
    console.warn("Failed to initialize Upstash Redis Client. Caching will be bypassed.", error.message);
  }
} else {
  console.warn("Upstash Redis credentials missing in .env. Caching will be bypassed.");
}

// Circuit-breaker wrapped Redis client
const safeRedisClient = rawClient
  ? {
      async get(key) {
        if (isDisabled && Date.now() < disabledUntil) return null;
        try {
          return await rawClient.get(key);
        } catch (err) {
          console.warn(`[Redis CircuitBreaker] Redis GET error: ${err.message}. Disabling Redis for 5 minutes.`);
          isDisabled = true;
          disabledUntil = Date.now() + 5 * 60 * 1000;
          return null;
        }
      },

      async set(key, value, opts) {
        if (isDisabled && Date.now() < disabledUntil) return null;
        try {
          return await rawClient.set(key, value, opts);
        } catch (err) {
          console.warn(`[Redis CircuitBreaker] Redis SET error: ${err.message}. Disabling Redis for 5 minutes.`);
          isDisabled = true;
          disabledUntil = Date.now() + 5 * 60 * 1000;
          return null;
        }
      },

      async del(key) {
        if (isDisabled && Date.now() < disabledUntil) return null;
        try {
          return await rawClient.del(key);
        } catch (err) {
          console.warn(`[Redis CircuitBreaker] Redis DEL error: ${err.message}. Disabling Redis for 5 minutes.`);
          isDisabled = true;
          disabledUntil = Date.now() + 5 * 60 * 1000;
          return null;
        }
      },
    }
  : null;

module.exports = safeRedisClient;
