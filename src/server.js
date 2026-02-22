require("dotenv").config();
const cors = require("cors");
const app = require("./app");
const {
  watchPosts,
  watchEvents,
  watchGames,
} = require("./services/listener.service");

// ✅ START CRON JOBS (Critical fix: this was missing!)
require("./jobs/cron");

const PORT = process.env.PORT || 5000;

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

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/feed", require("./routes/feedRoutes"));
app.use("/api/engage", require("./routes/engagementRoutes"));
// etc.

watchPosts();
watchGames();
watchEvents();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
