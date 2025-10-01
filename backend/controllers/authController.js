/**
 * @fileoverview Handles user authentication logic: registration and login using file storage, bcrypt and JWT tokens.
 * @module controllers/authController
 * @version 1.0.2
 * @author Hannah
 * @date 2025-06-29
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  loadUsers,
  saveUsers,
  userExists,
  findUserByEmail,
} = require("../models/userStore");
const { v4: uuidv4 } = require("uuid");

/**
 * Validate if the given email has a proper format.
 * @param {string} email
 * @returns {boolean}
 */
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength:
 * - At least 8 characters
 * - Contains at least one letter and one number
 * - Contains only allowed characters: a-z, A-Z, 0-9, _, -, +, @
 * @param {string} password
 * @returns {boolean}
 */
const validatePasswordStrength = (password) => {
  const allowedChars = /^[A-Za-z0-9_\-+@]+$/;
  const hasLetter = /[A-Za-z]/;
  const hasNumber = /[0-9]/;

  return (
    password.length >= 8 &&
    allowedChars.test(password) &&
    hasLetter.test(password) &&
    hasNumber.test(password)
  );
};

/**
 * Register a new user.
 * @param {import('express').Request} req - username, email, password
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (!validateEmailFormat(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (!validatePasswordStrength(password)) {
    return res.status(400).json({
      error:
        "Password must be at least 8 characters long, include letters and numbers, and only use a-z, A-Z, 0-9, _ - + @",
    });
  }

  if (userExists(email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const hash = await bcrypt.hash(password, 10);
  const users = loadUsers();
  const userId = uuidv4();
  const tokenVersion = 0;
  users.push({ userId, username, email, password: hash, tokenVersion });
  saveUsers(users);

  const token = jwt.sign(
    {
      userId: userId,
      email: email,
      username: username,
      tokenVersion: tokenVersion,
    },
    process.env.JWT_SECRET || "demo-secret-key",
    { expiresIn: "7d" }
  );

  res.status(201).json({ message: "User registered", token: token });
};

/**
 * Login an existing user.
 * @param {import('express').Request} req - email, password
 * @param {import('express').Response} res
 * @returns {void}
 */
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "User does not exist" });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      username: user.username,
      tokenVersion: user.tokenVersion || 0,
    },
    process.env.JWT_SECRET || "demo-secret-key",
    { expiresIn: "7d" }
  );

  res.json({ message: "User logined", token: token });
};

module.exports = {
  register,
  login,
  validateEmailFormat,
  validatePasswordStrength,
};
