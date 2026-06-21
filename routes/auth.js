const express = require("express");
const router = express.Router();
const authController = require("../controller/auth");
const { loginCheck, isAuth, isAdmin } = require("../middleware/auth");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { signupSchema, signinSchema } = require("../validators/auth.validator");

router.post("/isadmin", authController.isAdmin);
router.post("/signup", registerLimiter, validate(signupSchema), authController.postSignup);
router.post("/signin", loginLimiter, validate(signinSchema), authController.postSignin);
router.post("/signout", authController.logout);
router.post("/refresh-token", authController.refreshTokenRotate);
router.post("/user", loginCheck, isAuth, isAdmin, authController.allUser);

module.exports = router;
