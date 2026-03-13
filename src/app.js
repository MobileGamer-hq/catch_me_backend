const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
// const morgan = require("morgan");
// const cookieParser = require("cookie-parser");

const app = express();

// Middleware
app.use(cors());
// app.use(morgan("dev"));
// app.use(cookieParser());
app.use(express.json()); // Parses JSON body
app.use(require("./middleware/sessionContext"));

//Routes
app.get("/", (req, res) => {
  res.send("Catch Me Backend");
});

app.get("/ping", (req, res) => {
  res.send("Pong!");
});

const leaderboardRoutes = require("./routes/leaderboardRoutes");
const gameRoutes = require("./routes/gameRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const feedRoutes = require("./routes/feedRoutes");
const eventRoutes = require("./routes/eventRoutes");
const searchRoutes = require("./routes/searchRoutes");

app.use("/api/users", userRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/search", searchRoutes);

module.exports = app;
