const express = require("express");
const { getUserFeed } = require("../controllers/feedController");
const { deletePost } = require("../controllers/postController");
const { localSearchPosts } = require("../controllers/contentController");
const router = express.Router();

//Post
router.get("/local-search", localSearchPosts);
router.get("/:id", getUserFeed);
router.delete("/:id", deletePost);

module.exports = router;
