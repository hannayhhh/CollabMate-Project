/**
 * @fileoverview Routes for user information.
 * @module routes/user
 * @version 1.0.0
 * @date 2025-07-19
 */

const express = require("express");
const router = express.Router();
const {
  setStatus,
  getStatus,
  getAllStatuses,
  updateUserProfile,
  getUserProfile,
  getAllUsers,
  deleteUser,
} = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /user/status/all:
 *   get:
 *     summary: Get the status of all users
 *     tags: [UserStatus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of userId and status
 */
/**
 * Get the status of all users.
 * @route GET /user/status/all
 * @group UserStatus - Get all user statuses
 * @returns {Array<object>} 200 - [{ userId, status }]
 */
router.get("/status/all", verifyToken, getAllStatuses);

/**
 * @swagger
 * /user/{userId}/status:
 *   get:
 *     summary: Get a user's status by ID
 *     tags: [UserStatus]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The user's status
 *       404:
 *         description: User not found
 */
/**
 * Get a user's status by ID.
 * @route GET /user/:userId/status
 * @group UserStatus - Get user status
 * @param {string} userId.path.required - User ID
 * @returns {object} 200 - { userId, status }
 * @returns {Error} 404 - User not found
 */
router.get("/:userId/status", verifyToken, getStatus);

/**
 * @swagger
 * /user/{userId}/status:
 *   patch:
 *     summary: Set a user's status
 *     tags: [UserStatus]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, busy, offline]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: User not found
 */
/**
 * Set a user's status (online, busy, offline).
 * @route PATCH /user/:userId/status
 * @group UserStatus - Set user status
 * @param {string} userId.path.required - User ID
 * @param {string} status.body.required - Status value ("online", "busy", "offline")
 * @returns {object} 200 - { message, userId, status }
 * @returns {Error} 400 - Invalid status
 * @returns {Error} 404 - User not found
 */
router.patch("/:userId/status", verifyToken, setStatus);

/**
 * @swagger
 * /user/{userId}/profile:
 *   patch:
 *     summary: Update user's profile
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               image: { type: string }
 *               role: { type: string }
 *               status: { type: string }
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: No valid profile fields to update
 *       404:
 *         description: User not found
 */
/**
 * Update a user's profile (fields: username, email, phone, image, role, status).
 * @route PATCH /user/:userId/profile
 * @group User - Update user profile
 * @param {string} userId.path.required - User ID
 * @returns {object} 200 - { message, userId, profile }
 * @returns {Error} 400 - No valid profile fields to update
 * @returns {Error} 404 - User not found
 */
router.patch("/:userId/profile", verifyToken, updateUserProfile);

/**
 * @swagger
 * /user/{userId}/profile:
 *   get:
 *     summary: Get user's profile by ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile object
 *       404:
 *         description: User not found
 */
/**
 * Get a user's profile by ID.
 * @route GET /user/:userId/profile
 * @group User - Get user profile
 * @param {string} userId.path.required - User ID
 * @returns {object} 200 - { userId, profile }
 * @returns {Error} 404 - User not found
 */
router.get("/:userId/profile", verifyToken, getUserProfile);

/**
 * @swagger
 * /user/all:
 *   get:
 *     summary: Get all users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
/**
 * Get all users.
 * @route GET /user/all
 * @group User - Get all users
 * @returns {Array<object>} 200 - List of user objects
 */
router.get("/all", verifyToken, getAllUsers);

/**
 * @swagger
 * /user/{userId}:
 *   delete:
 *     summary: Delete a user by ID (cascade update in tasks and teams)
 *     description: |
 *       Deletes a user by their ID.
 *       Also removes the userId from all `tasks.userIds` arrays and all `teams.members` arrays.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The ID of the user to delete
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       404:
 *         description: User not found
 */
/**
 * Delete a user by ID
 *
 * @route DELETE /user/{userId}
 * @group User - User management
 * @param {string} userId.path.required - User ID
 * @returns {object} 200 - { message, user }
 * @returns {Error} 404 - User not found
 */
router.delete("/:userId", verifyToken, deleteUser);

module.exports = router;
