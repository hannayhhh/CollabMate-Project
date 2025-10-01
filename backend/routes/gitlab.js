/**
 * @fileoverview Routes for GitLab.
 * @module routes/gitlab
 * @version 1.0.1
 * @author Hannah
 * @date 2025-07-20
 * @update 2025-08-03
 */

const express = require("express");
const router = express.Router();
const {
  initiateGitlabLogin,
  handleGitlabCallback,
  getGitlabUser,
  getUserProjects,
  unlinkGitlab,
  getProjectNameList,
  getProjectIssuesAsTasks,
  getProjectIssueIDLists,
  getSingleProjectIssue,
} = require("../controllers/gitlabController");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /gitlab/login:
 *   get:
 *     summary: Redirect user to GitLab OAuth login
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       302:
 *         description: Redirect to GitLab login page
 *       401:
 *         description: Missing or invalid token
 */
/**
 * @route GET /gitlab/login
 * @group GitLab - OAuth
 * @returns {302} Redirect to GitLab OAuth login
 * @returns {401} Unauthorized (missing token)
 */
router.get("/login", verifyToken, initiateGitlabLogin);

/**
 * @swagger
 * /gitlab/callback:
 *   get:
 *     summary: Handle GitLab OAuth callback and store access token
 *     tags: [GitLab]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         description: Authorization code from GitLab
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         description: User ID passed as state
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GitLab account linked successfully
 *       400:
 *         description: Missing code or state
 *       500:
 *         description: GitLab OAuth failed
 */
/**
 * @route GET /gitlab/callback
 * @group GitLab - OAuth
 * @param {string} code.query.required - Authorization code from GitLab
 * @param {string} state.query.required - User ID passed as state
 * @returns {302} Redirect to frontend on success
 * @returns {400} Missing code or state
 * @returns {500} GitLab OAuth failed
 */
router.get("/callback", handleGitlabCallback);

/**
 * @swagger
 * /gitlab/user:
 *   get:
 *     summary: Get authenticated GitLab user's profile info
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GitLab user profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: GitLab API request failed
 */
/**
 * @route GET /gitlab/user
 * @group GitLab - User
 * @returns {200} GitLab user profile info
 * @returns {401} Unauthorized (token missing or GitLab not linked)
 * @returns {500} GitLab API request failed
 */
router.get("/user", verifyToken, getGitlabUser);

/**
 * @swagger
 * /gitlab/projects:
 *   get:
 *     summary: Get projects accessible to the authenticated GitLab user
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of GitLab projects retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: GitLab API request failed
 */
/**
 * @route GET /gitlab/projects
 * @group GitLab - Projects
 * @returns {200} List of GitLab projects accessible to user
 * @returns {401} Unauthorized (token missing or GitLab not linked)
 * @returns {500} Failed to fetch GitLab projects
 */
router.get("/projects", verifyToken, getUserProjects);

/**
 * @swagger
 * /gitlab/unlink:
 *   delete:
 *     summary: Unlink GitLab from the current user account
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GitLab unlinked successfully
 *       404:
 *         description: User not found
 */
/**
 * @route DELETE /gitlab/unlink
 * @group GitLab - OAuth
 * @returns {200} GitLab unlinked successfully
 * @returns {404} User not found
 */
router.delete("/unlink", verifyToken, unlinkGitlab);

/**
 * @swagger
 * /gitlab/projects/names:
 *   get:
 *     summary: Get user's GitLab project ID and name list
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of { id, name } for GitLab projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       401:
 *         description: GitLab not linked
 */
/**
 * @route GET /gitlab/projects/names
 * @group GitLab - Projects
 * @returns {Array<Object>} 200 - List of project { id, name }
 * @returns {401} GitLab not linked
 */
router.get("/projects/names", verifyToken, getProjectNameList);

/**
 * @swagger
 * /gitlab/projects/{projectId}/issues/as-tasks:
 *   get:
 *     summary: Import GitLab project issues as local tasks
 *     description: |
 *       Fetch issues from the specified GitLab project and convert them to local task format.
 *       Automatically maps title, description, state, and assignees (if matched).
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         schema:
 *           type: integer
 *         required: true
 *         description: GitLab project ID
 *     responses:
 *       200:
 *         description: Successfully fetched and converted issues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: GitLab issues converted to tasks
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: GitLab not linked
 *       500:
 *         description: GitLab API error or transformation failure
 */
/**
 * @route GET /gitlab/projects/:projectId/issues-to-tasks
 * @group GitLab - Issues
 * @description Fetch issues of a GitLab project and convert to local task format
 * @returns {200} List of formatted tasks from GitLab issues
 * @returns {401} Unauthorized (missing token or GitLab not linked)
 * @returns {500} GitLab API error
 */
router.get("/projects/:projectId/issues/as-tasks", verifyToken, getProjectIssuesAsTasks);

/**
 * @swagger
 * /gitlab/projects/{projectId}/issues/ids:
 *   get:
 *     summary: Get basic issue info from a GitLab project
 *     description: |
 *       Return simplified list of issueId, title, issueIid and state from GitLab project.
 *       Useful for preview, selection or matching.
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         schema:
 *           type: integer
 *         required: true
 *         description: GitLab project ID
 *     responses:
 *       200:
 *         description: List of simplified issue objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   issueId:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   state:
 *                     type: string
 *                     enum: [opened, closed]
 *                   issueIid:
 *                     type: integer
 *       401:
 *         description: GitLab not linked
 *       500:
 *         description: GitLab API error
 */
/**
 * Get all issues under a GitLab project (only basic info).
 * @route GET /gitlab/projects/:projectId/issues
 * @group GitLab - Issues
 * @param {string} projectId.path.required - GitLab project ID
 * @returns {200} List of issue summaries
 * @returns {401} Unauthorized or GitLab not linked
 * @returns {500} Failed to fetch issues
 */
router.get("/projects/:projectId/issues/ids", verifyToken, getProjectIssueIDLists);

/**
 * @swagger
 * /gitlab/projects/{projectId}/issues/{issueIid}:
 *   get:
 *     summary: Get single GitLab issue and convert to local task
 *     description: |
 *       Fetch one issue from GitLab by projectId and issueIid,
 *       and create a corresponding local task (without saving if already exists).
 *     tags: [GitLab]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         schema:
 *           type: integer
 *         required: true
 *         description: GitLab project ID
 *       - in: path
 *         name: issueIid
 *         schema:
 *           type: integer
 *         required: true
 *         description: GitLab issue IID
 *     responses:
 *       201:
 *         description: Successfully imported as task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized or GitLab not linked
 *       404:
 *         description: GitLab issue not found
 *       500:
 *         description: Failed to import issue
 */
/**
 * Import a single GitLab issue into our local task system.
 * @route POST /gitlab/projects/:projectId/issues/:issueIid/import
 * @group GitLab - Issues
 * @param {string} projectId.path.required - GitLab project ID
 * @param {string} issueIid.path.required - GitLab issue ID
 * @returns {201} Task created from issue
 * @returns {401} Unauthorized
 * @returns {404} Issue not found
 * @returns {500} GitLab API or local storage error
 */
router.get("/projects/:projectId/issues/:issueIid", verifyToken, getSingleProjectIssue);

module.exports = router;
