/**
 * @fileoverview Routes for search.
 * @module route/search
 * @version 1.0.0
 * @date 2025-07-19
 */

const express = require("express");
const router = express.Router();
const { search } = require("../controllers/searchController");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Fuzzy search tasks, users, or teams
 *     description: Search tasks , users, or teams by keyword.
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [task, user, team]
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of matched results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing or invalid parameters
 */
/**
 * Search tasks, users, or teams by keyword.
 * @route GET /search
 * @group Search - Fuzzy search
 * @param {string} type.query.required - One of 'task', 'user', 'team'
 * @param {string} keyword.query.required - Keyword to search
 * @returns {Array<object>} 200 - Matched result list
 * @returns {Error} 400 - Missing required parameters or invalid type
 */
router.get("/", verifyToken, search);

module.exports = router;
