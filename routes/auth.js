const express = require("express");
const router = express.Router();
const authController = require("../controller/auth");
const { loginCheck, isAuth, isAdmin } = require("../middleware/auth");

const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");

router.post("/isadmin", authController.isAdmin);
router.post("/signup", registerLimiter, authController.postSignup);
router.post("/signin", loginLimiter, authController.postSignin);
router.post("/signout", authController.logout);
router.post("/user", loginCheck, isAuth, isAdmin, authController.allUser);

module.exports = router;
