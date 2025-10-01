/**
 * @fileoverview Routes for team-related operations: create team, add member, assign role, and fetch team info.
 * @module routes/team
 * @version 1.2.0
 * @date 2025-07-16
 * @update 2025-07-19
 */

const express = require("express");
const router = express.Router();
const {
  createTeam,
  addMember,
  assignRole,
  getTeamById,
  getTeamMembersDetailed,
  deleteTeam,
  leaveTeam,
} = require("../controllers/teamController");
const { verifyToken } = require("../middleware/authMiddleware"); // Introducing certification middleware

/**
 * @swagger
 * /team:
 *   post:
 *     summary: Create a new team
 *     tags: [Team]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamName
 *             properties:
 *               teamName:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Team created
 */
/**
 * Create a new team.
 * @route POST /team
 * @group Team - Team creation
 * @param {string} teamName.body.required - Name of the team
 * @returns {object} 201 - { message, team }
 * @returns {Error} 400 - Missing teamName
 */
router.post("/", verifyToken, createTeam);

/**
 * @swagger
 * /team/{teamId}/member:
 *   patch:
 *     summary: Add a user to a team
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member added to team
 */
/**
 * Add a user to a team.
 * @route PATCH /team/:teamId/member
 * @group Team - Add team member
 * @param {string} teamId.path.required - Team ID
 * @param {string} userId.body.required - User ID to add
 * @returns {object} 200 - { message, team }
 * @returns {Error} 404 - Team not found
 * @returns {Error} 404 - User not found
 */
router.patch("/:teamId/member", verifyToken, addMember);

/**
 * @swagger
 * /team/{teamId}/role:
 *   patch:
 *     summary: Assign a role to a team member
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role assigned
 */
/**
 * Assign a role to a team member.
 * @route PATCH /team/:teamId/role
 * @group Team - Assign role
 * @param {string} teamId.path.required - Team ID
 * @param {string} userId.body.required - User ID to assign role
 * @param {string} role.body.required - Role name to assign
 * @returns {object} 200 - { message, userId, role }
 * @returns {Error} 404 - User not found
 * @returns {Error} 400 - User not in this team
 */
router.patch("/:teamId/role", verifyToken, assignRole);

/**
 * @swagger
 * /team/{teamId}:
 *   get:
 *     summary: Get team information by ID
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team object returned
 */
/**
 * Get team information by ID.
 * @route GET /team/:teamId
 * @group Team - Get team info
 * @param {string} teamId.path.required - Team ID
 * @returns {object} 200 - Team object
 * @returns {Error} 404 - Team not found
 */
router.get("/:teamId", verifyToken, getTeamById);

/**
 * @swagger
 * /team/{teamId}/members/detailed:
 *   get:
 *     summary: Get detailed information of all team members
 *     description: |
 *       Returns detailed information for all members in a team, including userId, username, image, phone, role, status, and assigned tasks (taskId, title, status, deadline).
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of member detailed info
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   username:
 *                     type: string
 *                   image:
 *                     type: string
 *                     nullable: true
 *                   phone:
 *                     type: string
 *                   role:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [online, busy, offline]
 *                   tasks:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         taskId:
 *                           type: string
 *                         title:
 *                           type: string
 *                         status:
 *                           type: string
 *                         deadline:
 *                           type: string
 *                           format: date-time
 *       404:
 *         description: Team not found
 */
/**
 * Get all detailed team members info by teamId.
 * @route GET /team/:teamId/members/detailed
 * @group Team - Get team members detailed info
 * @param {string} teamId.path.required - Team ID
 * @returns {Array<object>} 200 - Member detailed info list
 * @returns {Error} 404 - Team not found
 */
router.get("/:teamId/members/detailed", verifyToken, getTeamMembersDetailed);

/**
 * @swagger
 * /team/{teamId}:
 *   delete:
 *     summary: Delete a team by ID (cascade clear user.teamId)
 *     description: |
 *       Deletes a team by its ID.
 *       Also clears the `teamId` field of all users who belonged to this team.
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         description: The ID of the team to delete
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 team:
 *                   type: object
 *       404:
 *         description: Team not found
 */
/**
 * Delete a team by ID
 * @route DELETE /team/{teamId}
 * @group Team - Team management
 * @param {string} teamId.path.required - Team ID
 * @returns {object} 200 - { message, team }
 * @returns {Error} 404 - Team not found
 */
router.delete("/:teamId", verifyToken, deleteTeam);

/**
 * @swagger
 * /team/{teamId}/leave:
 *   post:
 *     summary: Let a user leave the team
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user leaving the team
 *     responses:
 *       200:
 *         description: User left the team or team deleted
 *       400:
 *         description: User not in team
 *       404:
 *         description: Team not found
 */

/**
 * @route POST /team/:teamId/leave
 * @group Team - Membership
 * @param {string} teamId.path.required - ID of the team to leave
 * @param {string} userId.body.required - ID of the user leaving the team
 * @returns {200} User left the team or team deleted
 * @returns {400} User not in team
 * @returns {404} Team not found
 */
router.post("/:teamId/leave", verifyToken, leaveTeam);

module.exports = router;
