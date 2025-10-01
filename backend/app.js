/**
 * @fileoverview Application entry point - configures middleware, CORS, and mounts route modules for the backend server.
 * @author Hannah
 * @date 2025-06-29
 * @version 1.0.1
 */

require("dotenv").config(); // Load .env variables

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

// Enable CORS for frontend dev environment
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(bodyParser.json({ limit: '5mb' }));

// Default homepage welcome message
app.get("/", (req, res) => {
  res.send(
    '<h2>✅ CollabMate API Server is Running</h2><p>Go to <a href="/docs">docs</a> to view documentation.</p>'
  );
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Mount auth routes (register + login)
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// Mount team routes
const teamRoutes = require("./routes/team");
app.use("/team", teamRoutes);

// Mount task routes
const taskRoutes = require("./routes/task");
app.use("/task", taskRoutes);

// Mount dashboard routes
const dashboardRoutes = require("./routes/dashboard");
app.use("/dashboard", dashboardRoutes);

// Mount user routes
const userRoutes = require("./routes/user");
app.use("/user", userRoutes);

// Mount search routes
const searchRoutes = require("./routes/search");
app.use("/search", searchRoutes);

// Mount Gitlab routes
const gitlabRoutes = require('./routes/gitlab');
app.use('/gitlab', gitlabRoutes);

// Mount swagger file
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swaggerConfig");

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Export to test use
module.exports = app;