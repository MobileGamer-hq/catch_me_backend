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
const { getBatchByType } = require("../controllers/batchController");

//User
router.get("/", getUsers); // get all users
router.post("/batch", (req, res, next) => {
  req.params.type = "users";
  return getBatchByType(req, res, next);
}); // batch get users by IDs (Redis-first)

router.get("/local-search", localSearchUsers); // fuzzy search on minified local data
router.get("/search", searchUsers); //search users by name, email, etc.
router.get("/:id", getUser); //
router.delete("/:id", deleteUser); //
router.get("/:id/suggestions", getSuggestions); // "You May Know"

module.exports = router;

