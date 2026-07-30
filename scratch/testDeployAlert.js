const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const telegramService = require("../services/telegramService");

async function run() {
  console.log("Testing Telegram deployment notification...");
  await telegramService.sendDeploymentNotification("1.1.16");
  console.log("Finished test!");
}

run();
