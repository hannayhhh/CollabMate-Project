/**
 * @fileoverview Controller for user profile operations (profile update, status, etc).
 * @module controllers/userController
 * @version 1.0.0
 * @date 2025-07-19
 */

const {
  setUserStatus,
  getUserStatus,
  getAllUserStatuses,
  loadUsers,
  saveUsers,
} = require("../models/userStore");
const { loadTasks, saveTasks } = require("../models/taskStore");
const { loadTeams, saveTeams } = require("../models/teamStore");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Set a user's status (online, busy, offline).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const setStatus = (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  if (!["online", "busy", "offline"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (!setUserStatus(userId, status)) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ message: "Status updated", userId, status });
};

/**
 * Get a user's status by ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getStatus = (req, res) => {
  const { userId } = req.params;
  const status = getUserStatus(userId);
  if (status === null) return res.status(404).json({ error: "User not found" });
  res.json({ userId, status });
};

/**
 * Get all users' status (online/busy/offline).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getAllStatuses = (req, res) => {
  res.json(getAllUserStatuses());
};

/**
 * Update a user's profile information.
 * Only allows updating whitelisted fields (for security).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateUserProfile = (req, res) => {
  const { userId } = req.params;
  const allowedFields = [
    "username",
    "email",
    "phone",
    "image",
    "role",
    "status",
    "password",
  ];
  const updates = req.body;

  const users = loadUsers();
  const user = users.find((u) => u.userId === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  let changed = false;
  let tokenSensitiveChanged = false;

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key) && typeof updates[key] === "string") {
      // Hash password
      if (key === "password" && !bcrypt.compareSync(updates[key], user.password) ) {
        user[key] = bcrypt.hashSync(updates[key], 10);
        tokenSensitiveChanged = true;
      } else if (key === "email" && updates[key] !== user.email){
        user[key] = updates[key];
        tokenSensitiveChanged = true;
      }else{
        user[key] = updates[key];
      }
      changed = true;
    }
  });

  // If the sensitive information (email/password) changes, tokenVersion++
  if (tokenSensitiveChanged) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  if (!changed)
    return res.status(400).json({ error: "No valid profile fields to update" });

  saveUsers(users);
  res.json({ message: "Profile updated", userId, profile: user });
};

/**
 * Get a user's profile by ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getUserProfile = (req, res) => {
  const { userId } = req.params;
  const users = loadUsers();
  const user = users.find((u) => u.userId === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ userId, profile: user });
};

/**
 * Get all users' basic info.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getAllUsers = (req, res) => {
  const users = loadUsers();
  res.json(users);
};

/**
 * Delete a user by ID. Removes references from all tasks (userIds) and all teams (members).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const deleteUser = (req, res) => {
  const { userId } = req.params;
  let users = loadUsers();
  const idx = users.findIndex((u) => u.userId === userId);
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  const deletedUser = users.splice(idx, 1)[0];
  saveUsers(users);

  // Remove userId from all tasks.userIds
  let tasks = loadTasks();
  let tasksChanged = false;
  tasks = tasks.map((task) => {
    if (Array.isArray(task.userIds) && task.userIds.includes(userId)) {
      task.userIds = task.userIds.filter((id) => id !== userId);
      tasksChanged = true;
    }
    return task;
  });
  if (tasksChanged) saveTasks(tasks);

  // Remove userId from all teams.members
  let teams = loadTeams();
  let teamsChanged = false;
  teams = teams.map((team) => {
    if (Array.isArray(team.members) && team.members.includes(userId)) {
      team.members = team.members.filter((id) => id !== userId);
      teamsChanged = true;
    }
    return team;
  });
  if (teamsChanged) saveTeams(teams);

  return res.status(200).json({ message: "User deleted", user: deletedUser });
};

module.exports = {
  setStatus,
  getStatus,
  getAllStatuses,
  updateUserProfile,
  getUserProfile,
  getAllUsers,
  deleteUser,
};
