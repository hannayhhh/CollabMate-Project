/**
 * @fileoverview Controller for search functionality (tasks, users, teams).
 * @module controllers/searchController
 * @version 1.0.0
 * @date 2025-07-19
 */

const { loadTasks } = require("../models/taskStore");
const { loadUsers } = require("../models/userStore");
const { loadTeams } = require("../models/teamStore");

/**
 * Fuzzy search tasks, users, or teams by kw.
 * @param {string} type.query.required - One of 'task', 'user', 'team'
 * @param {string} keyword.query.required - Keyword to search (case-insensitive)
 */
const search = (req, res) => {
  const { type, keyword } = req.query;
  if (!type || !keyword) {
    return res
      .status(400)
      .json({ error: "Missing required parameters (type, keyword)" });
  }
  const kw = keyword.trim().toLowerCase();
  let result = [];

  if (type === "task") {
    const tasks = loadTasks();
    result = tasks.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(kw)) ||
        (t.description && t.description.toLowerCase().includes(kw)) ||
        (t.status && t.status.toLowerCase().includes(kw))
    );
  } else if (type === "user") {
    const users = loadUsers();
    result = users.filter(
      (u) =>
        (u.username && u.username.toLowerCase().includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw)) ||
        (u.phone && u.phone.includes(kw)) ||
        (u.role && u.role.toLowerCase().includes(kw))
    );
  } else if (type === "team") {
    const teams = loadTeams();
    result = teams.filter(
      (t) =>
        (t.teamName && t.teamName.toLowerCase().includes(kw)) ||
        (t.teamId && t.teamId.toLowerCase().includes(kw))
    );
  } else {
    return res
      .status(400)
      .json({ error: "Invalid type. Must be task, user, or team." });
  }

  res.json({ result });
};

module.exports = {
  search,
};
