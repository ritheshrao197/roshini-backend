const { Redis } = require("@upstash/redis");

let redisClient = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("==============Upstash Redis Client Initialized==============");
  } catch (error) {
    console.warn("Failed to initialize Upstash Redis Client. Caching will be bypassed.", error.message);
  }
} else {
  console.warn("Upstash Redis credentials missing in .env. Caching will be bypassed.");
}

module.exports = redisClient;
