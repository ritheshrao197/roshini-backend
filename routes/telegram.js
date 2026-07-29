const express = require("express");
const router = express.Router();
const telegramController = require("../controller/telegram");

router.post("/webhook", telegramController.handleWebhook);

module.exports = router;
