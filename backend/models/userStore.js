/**
 * @fileoverview User data store module - handles reading and writing user data to a local JSON file.
 * @module models/userStore
 * @author Hannah
 * @date 2025-06-29
 * @version 1.0.2
 * @update 2025-07-19
 */

const fs = require("fs");
const path = require("path");

const USERS_FILE_PATH = path.join(__dirname, "../data/users.json");

/**
 * Load all users from the JSON file.
 * @returns {Array<Object>} Array of user objects
 */
const loadUsers = () => {
  if (!fs.existsSync(USERS_FILE_PATH)) return [];
  const data = fs.readFileSync(USERS_FILE_PATH, "utf-8");
  return JSON.parse(data || "[]");
};

/**
 * Save the given user list to the JSON file.
 * @param {Array<Object>} users - Array of user objects to write
 */
const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
};

/***************** Login ********************/
/**
 * Find a user by email.
 * @param {string} email
 * @returns {Object|null} User object or null if not found
 */
const findUserByEmail = (email) => {
  const users = loadUsers();
  return users.find((u) => u.email === email) || null;
};

/**
 * Find a user by id.
 * @param {string} userId
 * @returns {Object|null} User object or null if not found
 */
const findUserById = (userId) => {
  const users = loadUsers();
  return users.find((u) => u.userId === userId) || null;
};

/**
 * Check if a user with the given email exists.
 * @param {string} email
 * @returns {boolean}
 */
const userExists = (email) => {
  return !!findUserByEmail(email);
};

/***************** Update Information ********************/
/**
 * Set the status (online, busy, offline) for a user.
 * @param {string} userId - User ID
 * @param {string} status - User status ("online"|"busy"|"offline")
 * @returns {boolean} True if update succeeded, false if user not found
 */
const setUserStatus = (userId, status) => {
  const users = loadUsers();
  const user = users.find((u) => u.userId === userId);
  if (!user) return false;
  user.status = status;
  saveUsers(users);
  return true;
};

/**
 * Get the current status of a user by ID.
 * @param {string} userId - User ID
 * @returns {string|null} User status ("online"|"busy"|"offline") or null if not found
 */
const getUserStatus = (userId) => {
  const user = findUserById(userId);
  return user ? user.status || "offline" : null;
};

/**
 * Get the status of all users.
 * @returns {Array<{userId: string, status: string}>} Array of userId and status
 */
const getAllUserStatuses = () => {
  return loadUsers().map((u) => ({
    userId: u.userId,
    status: u.status || "offline",
  }));
};

module.exports = {
  loadUsers,
  saveUsers,
  findUserByEmail,
  findUserById,
  userExists,
  setUserStatus,
  getUserStatus,
  getAllUserStatuses,
};
