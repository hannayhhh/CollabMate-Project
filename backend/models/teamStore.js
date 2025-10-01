/**
 * @fileoverview Team data store module - handles reading and writing team data to a local JSON file.
 * @module models/teamStore
 * @version 1.0.0
 * @date 2025-06-29
 * @update 2025-07-19
 */

const fs = require("fs");
const path = require("path");

const TEAMS_FILE_PATH = path.join(__dirname, "../data/teams.json");

/**
 * Load all teams from the JSON file.
 * @returns {Array<Object>} Array of team objects
 */
const loadTeams = () => {
  if (!fs.existsSync(TEAMS_FILE_PATH)) return [];
  const data = fs.readFileSync(TEAMS_FILE_PATH, "utf-8");
  return JSON.parse(data || "[]");
};

/**
 * Save all teams to the JSON file.
 * @param {Array<Object>} teams
 */
const saveTeams = (teams) => {
  fs.writeFileSync(TEAMS_FILE_PATH, JSON.stringify(teams, null, 2));
};

/**
 * Find a team by its ID.
 * @param {string} teamId
 * @returns {Object|null} team object or null
 */
const findTeamById = (teamId) => {
  return loadTeams().find((t) => t.teamId === teamId) || null;
};

module.exports = {
  loadTeams,
  saveTeams,
  findTeamById,
};
