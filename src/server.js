require("dotenv").config();
const app = require("./app");
const {
  watchPosts,
  watchEvents,
  watchGames,
} = require("./services/listener.service");

// ✅ START CRON JOBS
require("./jobs/cron");

const PORT = process.env.PORT || 5000;

watchPosts();
watchGames();
watchEvents();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
