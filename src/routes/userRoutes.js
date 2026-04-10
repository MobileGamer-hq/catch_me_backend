const express = require("express");
const router = express.Router();
const {
  getUser,
  deleteUser,
  searchUsers,
  getUsers,
  getSuggestions,
  localSearchUsers,
} = require("../controllers/userController");

//User
router.get("/", getUsers); // get all users
router.get("/local-search", localSearchUsers); // fuzzy search on minified local data
router.get("/:id", getUser); //
router.delete("/:id", deleteUser); //
router.get("/search", searchUsers); //search users by name, email, etc.
router.get("/:id/suggestions", getSuggestions); // "You May Know"

module.exports = router;
