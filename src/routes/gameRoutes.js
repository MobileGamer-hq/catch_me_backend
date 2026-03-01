const express = require("express");
const router = express.Router();
const {
  getGames,
  getGame,
  endGame,
  standardizeGame,
} = require("../controllers/gameController");

// Games
router.get("/", getGames);
router.get("/:id", getGame);
router.post("/:id/standardize", standardizeGame);
router.post("/:id/end", endGame);

module.exports = router;
