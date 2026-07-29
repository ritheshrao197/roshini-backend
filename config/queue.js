const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const logger = require("./logger");

let connection = null;
let queueAvailable = false;
let emailQueue = null;
let auditQueue = null;

const redisUrl = process.env.REDIS_URL;
const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl || (restUrl && restToken)) {
  try {
    let connectionOpts = {};
    if (redisUrl) {
      connectionOpts = {
        path: redisUrl, // standard connection string
        maxRetriesPerRequest: null,
      };
    } else {
      const host = restUrl.replace("https://", "").replace("http://", "");
      connectionOpts = {
        host,
        port: 6379,
        password: restToken,
        tls: {}, // Upstash TCP requires TLS
        connectTimeout: 3000,
        maxRetriesPerRequest: null, // Mandatory for BullMQ
        retryStrategy(times) {
          if (times > 2) {
            logger.warn("[Queue] Redis connection retry limit reached. Disabling background queues.");
            queueAvailable = false;
            return null; // Stop reconnecting
          }
          return 500;
        },
      };
    }

    connection = new IORedis(connectionOpts);
    
    connection.on("connect", () => {
      logger.info("[Queue] Successfully connected to Redis TCP.");
      queueAvailable = true;
    });

    connection.on("error", (err) => {
      logger.warn(`[Queue] Redis TCP connection error: ${err.message}. Background queues offline.`);
      queueAvailable = false;
    });

    emailQueue = new Queue("emailQueue", { connection, defaultJobOptions: { removeOnComplete: true } });
    auditQueue = new Queue("auditQueue", { connection, defaultJobOptions: { removeOnComplete: true } });
    queueAvailable = connection.status === "ready";
  } catch (err) {
    logger.error({ err }, "[Queue] Failed to initialize queues. Background queues offline.");
    queueAvailable = false;
  }
} else {
  logger.warn("[Queue] Redis credentials not configured. Background queues offline.");
}

function isQueueAvailable() {
  return queueAvailable && connection && connection.status === "ready";
}

module.exports = {
  connection,
  emailQueue,
  auditQueue,
  get queueAvailable() {
    return isQueueAvailable();
  },
  isQueueAvailable,
};
