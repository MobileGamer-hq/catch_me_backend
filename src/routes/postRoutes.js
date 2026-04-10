const express = require("express");
const {getUserFeed} = require("../controllers/feedController");
const { deletePost } = require("../controllers/postController");
const router = express.Router();

//Post
router.get("/:id", getUserFeed);
router.delete("/:id", deletePost);

module.exports = router;
