const express = require("express");
const router = express.Router();
const subscribersController = require("../controller/subscribers");
const { loginCheck, isAuth, isAdmin } = require("../middleware/auth");

router.post("/subscribe", subscribersController.postSubscribe);
router.get("/all", loginCheck, isAuth, isAdmin, subscribersController.getAllSubscribers);

module.exports = router;
