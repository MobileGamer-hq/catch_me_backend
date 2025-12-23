require("dotenv").config();
const app = require("./app");
const {watchPosts, watchEvents, watchGames} = require("./methods/listenerMethods");

const PORT = process.env.PORT || 5000;

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/feed", require("./routes/feedRoutes"));
// etc.


watchPosts();
watchGames();
watchEvents();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
