const express = require("express");
const router = express.Router();
const {
  getGames,
  getGame,
  endGame,
  standardizeGame,
  exportGamePdfLink,
  downloadGamePdf,
  createSummary,
  updateSummary,
  deleteSummary
} = require("../controllers/gameController");

const { getBatchByType } = require("../controllers/batchController");

// Games
router.get("/", getGames);
router.post("/batch", (req, res, next) => {
  req.params.type = "games";
  return getBatchByType(req, res, next);
}); // batch get games by IDs (Redis-first)
router.get("/:id", getGame);
router.post("/:id/standardize", standardizeGame);
router.post("/:id/end", endGame);
router.post("/:id/export", exportGamePdfLink);
router.get("/:id/download", downloadGamePdf);

// Summary AI
router.post("/:id/summary", createSummary);
router.put("/:id/summary", updateSummary);
router.delete("/:id/summary", deleteSummary);

module.exports = router;
