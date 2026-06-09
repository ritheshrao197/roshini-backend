const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/keys");
const userModel = require("../models/users");

exports.loginCheck = (req, res, next) => {
  try {
    let token = req.cookies.token || req.headers.token;
    if (!token) {
      console.warn("loginCheck: No token provided");
      return res.status(401).json({ error: "You must be logged in" });
    }
    token = token.replace("Bearer ", "");
    const decode = jwt.verify(token, JWT_SECRET);
    req.userDetails = decode;
    next();
  } catch (err) {
    console.error("JWT Verify Error:", err.message);
    res.status(401).json({
      error: "You must be logged in",
    });
  }
};

exports.isAuth = (req, res, next) => {
  let { loggedInUserId } = req.body;
  if (!loggedInUserId && req.method !== "GET" && req.method !== "DELETE") {
    // Some older POST/PUT routes might rely on loggedInUserId, but for GET/DELETE it's usually empty.
    // We'll just check if loggedInUserId is provided and doesn't match the token.
  }
  
  if (
    loggedInUserId && 
    (!req.userDetails._id || loggedInUserId != req.userDetails._id)
  ) {
    return res.status(403).json({ error: "You are not authenticated" });
  }
  next();
};

exports.isAdmin = async (req, res, next) => {
  try {
    let reqUser = await userModel.findById(req.body.loggedInUserId || req.userDetails._id);
    // If user role 0 that's mean not admin it's customer
    if (!reqUser || reqUser.userRole === 0) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } catch {
    return res.status(404).json({ error: "User not found" });
  }
};
