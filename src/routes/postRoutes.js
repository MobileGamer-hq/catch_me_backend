const express = require("express");
const { getUserFeed } = require("../controllers/feedController");
const { deletePost } = require("../controllers/postController");
const { localSearchPosts } = require("../controllers/contentController");
const { getBatchByType } = require("../controllers/batchController");
const router = express.Router();

//Post
router.post("/batch", (req, res, next) => {
  req.params.type = "posts";
  return getBatchByType(req, res, next);
}); // batch get posts by IDs (Redis-first)

router.get("/local-search", localSearchPosts);
router.get("/:id", getUserFeed);
router.delete("/:id", deletePost);

module.exports = router;

