const express = require("express");
const router = express.Router();
const newsletterController = require("../controller/newsletter");

router.post("/subscribe", newsletterController.subscribe);

module.exports = router;
