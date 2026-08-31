const express = require("express");
const cors = require("cors");
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "https://app.catchme.live",
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json()); // Parses JSON body
app.use(require("./middleware/responseFormatter"));
app.use(require("./middleware/sessionContext"));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Catch Me Backend" });
});

app.get("/ping", (req, res) => {
  res.json({ message: "Pong!" });
});

// Import Routes
const userRoutes = require("./routes/userRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const gameRoutes = require("./routes/gameRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const feedRoutes = require("./routes/feedRoutes");
const eventRoutes = require("./routes/eventRoutes");
const searchRoutes = require("./routes/searchRoutes");
const postRoutes = require("./routes/postRoutes");
const engagementRoutes = require("./routes/engagementRoutes");

// Register Routes
app.use("/api/users", userRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/engage", engagementRoutes);

// 404 Catch-All
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;
