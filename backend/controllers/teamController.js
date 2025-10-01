/**
 * @fileoverview Team controller - provides endpoints to manage team creation, membership, and role assignment.
 * @module controllers/teamController
 * @version 1.0.0
 * @date 2025-06-29
 */

const { loadTeams, saveTeams, findTeamById } = require("../models/teamStore");
const { loadUsers, saveUsers } = require("../models/userStore");
const { loadTasks } = require("../models/taskStore");
const { v4: uuidv4 } = require("uuid");

/**
 * Create a new team.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createTeam = (req, res) => {
  const { teamName, userId, description } = req.body;
  if (!teamName || !userId) {
    return res.status(400).json({ error: "Missing teamName or userId" });
  }

  const newTeam = {
    teamId: uuidv4(),
    teamName,
    members: [userId],
    administrator: userId,
    description: description || "",
    createdAt: new Date().toISOString(),
  };

  const teams = loadTeams();
  teams.push(newTeam);
  saveTeams(teams);

  const users = loadUsers();
  const user = users.find((u) => u.userId === userId);
  user.teamId = newTeam.teamId;
  saveUsers(users);

  res.status(201).json({ message: "Team created", team: newTeam });
};

/**
 * Add a user to a team.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const addMember = (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;

  const team = findTeamById(teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });

  const users = loadUsers();
  const user = users.find((u) => u.userId === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!team.members.includes(user.userId)) {
    team.members.push(user.userId);
    user.teamId = teamId;
    user.joinDate = new Date().toISOString();
    saveTeams(loadTeams().map((t) => (t.teamId === teamId ? team : t)));
    saveUsers(users);
  }

  res.json({ message: "Member added to team", team });
};

/**
 * Assign a role to a user in the team.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const assignRole = (req, res) => {
  const { teamId } = req.params;
  const { userId, role } = req.body;

  const users = loadUsers();
  const user = users.find((u) => u.userId === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.teamId !== teamId) {
    return res.status(400).json({ error: "User not in this team" });
  }

  user.role = role;
  saveUsers(users);

  res.json({ message: "Role assigned", userId, role });
};

/**
 * Get a team by ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getTeamById = (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  res.json(team);
};

/**
 * Get detailed information for all members in a team.
 * Includes: avatar, phone, role, status, assigned tasks (id, title, status).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getTeamMembersDetailed = (req, res) => {
  const { teamId } = req.params;
  const team = findTeamById(teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });

  const users = loadUsers();
  const tasks = loadTasks();

  // Traversing team members, assemble details
  const memberDetails = team.members
    .map((userId) => {
      const user = users.find((u) => u.userId === userId);
      if (!user) return null;
      // Find all tasks assigned to this member
      const assignedTasks = tasks
        .filter((t) => t.userIds && t.userIds.includes(userId))
        .map((t) => ({
          taskId: t.taskId,
          title: t.title,
          status: t.status,
          deadline: t.deadline,
        }));

      return {
        userId: user.userId,
        username: user.username,
        email: user.email,
        image: user.image || null,
        phone: user.phone || "",
        role: user.role || "",
        tasks: assignedTasks,
      };
    })
    .filter(Boolean); // Filter out teams whose users are not found

  res.json(memberDetails);
};

/**
 * Delete a team by ID. Clears teamId for all users in that team.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const deleteTeam = (req, res) => {
  const { teamId } = req.params;
  let teams = loadTeams();
  const idx = teams.findIndex((t) => t.teamId === teamId);
  if (idx === -1) return res.status(404).json({ error: "Team not found" });
  const deletedTeam = teams.splice(idx, 1)[0];
  saveTeams(teams);

  // Clear teamId for all users who belonged to this team
  let users = loadUsers();
  let changed = false;
  users = users.map((user) => {
    if (user.teamId === teamId) {
      user.teamId = null;
      changed = true;
    }
    return user;
  });
  if (changed) saveUsers(users);

  return res.status(200).json({ message: "Team deleted", team: deletedTeam });
};

/**
 * User leaves the team. If the user is the administrator, assign admin to next member or delete team if none.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const leaveTeam = (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;

  const teams = loadTeams();
  const users = loadUsers();

  const teamIndex = teams.findIndex((t) => t.teamId === teamId);
  if (teamIndex === -1)
    return res.status(404).json({ error: "Team not found" });

  const team = teams[teamIndex];

  // If the user is not in the team
  if (!team.members.includes(userId)) {
    return res.status(400).json({ error: "User not in team" });
  }

  // Remove the user
  team.members = team.members.filter((id) => id !== userId);

  // Update the user information
  const user = users.find((u) => u.userId === userId);
  if (user) {
    user.teamId = null;
    user.role = null;
  }

  // If the administrator leaves
  if (team.administrator === userId) {
    if (team.members.length === 0) {
      // No any member, delete all team
      teams.splice(teamIndex, 1);
      saveTeams(teams);
      saveUsers(users);
      return res
        .status(200)
        .json({ message: "Administrator left, team deleted" });
    } else {
      // Reassign the administrator as the second person to join (now the first one)
      team.administrator = team.members[0];
    }
  }

  // Save updated information
  teams[teamIndex] = team;
  saveTeams(teams);
  saveUsers(users);

  return res.status(200).json({ message: "User left the team", team });
};

module.exports = {
  createTeam,
  addMember,
  assignRole,
  getTeamById,
  getTeamMembersDetailed,
  deleteTeam,
  leaveTeam,
};
