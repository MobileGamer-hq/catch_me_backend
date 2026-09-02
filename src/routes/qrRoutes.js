const express = require("express");
const router = express.Router();
const {
  getQrCode,
  getProfileQr,
  getGameQr,
  getGameLineupQr,
  getGameStatsQr,
  getPostQr,
  getChallengeQr,
  generateQrJson,
  parseLink,
} = require("../controllers/qrController");

// General QR route (supports query parameters ?url=... or ?type=profile&id=...)
router.get("/", getQrCode);

// JSON Generator & Parser
router.post("/generate", generateQrJson);
router.get("/parse", parseLink);
router.post("/parse", parseLink);

// Direct entity QR shortcuts (returning PNG image/png)
router.get("/profile/:userId", getProfileQr);
router.get("/game/:gameId", getGameQr);
router.get("/game/:gameId/lineup", getGameLineupQr);
router.get("/game/:gameId/stats", getGameStatsQr);
router.get("/post/:postId", getPostQr);
router.get("/challenge/:challengeId", getChallengeQr);

module.exports = router;
