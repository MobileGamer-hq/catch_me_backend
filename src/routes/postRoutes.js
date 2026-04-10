const {getUserFeed} = require("../controllers/feedController");
const { deletePost } = require("../controllers/postController");
const { localSearchPosts } = require("../controllers/contentController");
const router = express.Router();

//Post
router.get("/:id", getUserFeed);
router.delete("/:id", deletePost);
router.get("/local-search", localSearchPosts);

module.exports = router;
