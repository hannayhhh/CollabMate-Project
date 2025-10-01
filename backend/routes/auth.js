/**
 * @fileoverview Routes for user registration and login endpoints under /auth path.
 * @module routes/auth
 * @version 1.0.1
 * @date 2025-06-29
 */

const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: JWT token returned
 *       400:
 *         description: Missing or invalid input
 */
/**
 * Register a new user.
 * @route POST /auth/register
 * @group Authentication - User Registration
 * @param {string} username.body.required - Username
 * @param {string} email.body.required - Email address
 * @param {string} password.body.required - Password
 * @returns {object} 201 - JWT token
 * @returns {object} 400 - Error message
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token returned
 *       401:
 *         description: Invalid credentials
 */
/**
 * @route POST /auth/login
 * @group Auth
 * @param {string} email.body.required - Email address
 * @param {string} password.body.required - Password
 * @returns {object} 200 - JWT token
 */
router.post("/login", login);

module.exports = router;
