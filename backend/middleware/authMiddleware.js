/**
 * @fileoverview Middleware to verify JWT token in Authorization header.
 * @module middleware/authMiddleware
 * @version 1.0.0
 * @author Hannah
 * @date 2025-07-08
 * @update 2025-07-19
 */

const jwt = require("jsonwebtoken");
const { loadUsers } = require("../models/userStore");
const SECRET_KEY = process.env.JWT_SECRET || "demo-secret-key";

/**
 * Middleware to verify JWT token from Authorization header.
 * Adds `req.userId` if token is valid.
 */
const verifyToken = (req, res, next) => {
  const authHeader =
    req.headers["authorization"] ||
    (req.query.token && `Bearer ${req.query.token}`);
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    // Verify the version number of the current token
    const users = loadUsers();
    const user = users.find((u) => u.userId === payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({
        message: "Token expired or user not found, please login again",
      });
    }
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = {
  verifyToken,
};
