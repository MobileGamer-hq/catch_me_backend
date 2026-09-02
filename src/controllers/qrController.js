const { QrService } = require("../services/qr.service");
const { LinkUtils } = require("../services/linkUtilities");

/**
 * Controller for QR Code Generation and Link Resolution
 */

/**
 * General QR code generator endpoint
 * GET /api/qr?url=... OR GET /api/qr?type=profile&id=...
 */
const getQrCode = async (req, res) => {
  try {
    const { url, link, text, type, id, format, size, margin, dark, light } = req.query;

    let targetUrl = url || link || text;

    if (!targetUrl && type && id) {
      const entity = await QrService.generateEntityQr(type, id, { size, margin, dark, light });
      targetUrl = entity.link;
    }

    if (!targetUrl) {
      return res.status(400).json({
        status: "FAILED",
        error: "Missing required parameters: provide 'url', 'link', 'text', or both 'type' and 'id'",
      });
    }

    const options = { size, margin, dark, light };

    if (format === "json") {
      const dataUrl = await QrService.generateDataUrl(targetUrl, options);
      return res.status(200).json({
        status: "SUCCESS",
        link: targetUrl,
        dataUrl,
      });
    }

    const buffer = await QrService.generatePngBuffer(targetUrl, options);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24h
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("QR Code Error:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Failed to generate QR code",
      details: error.message,
    });
  }
};

/**
 * Shortcut: Profile QR Code
 * GET /api/qr/profile/:userId
 */
const getProfileQr = async (req, res) => {
  try {
    const { userId } = req.params;
    const { size, margin, dark, light } = req.query;
    const { buffer } = await QrService.generateEntityQr("profile", userId, { size, margin, dark, light });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Profile QR Error:", error);
    return res.status(500).json({ status: "FAILED", error: "Failed to generate profile QR code" });
  }
};

/**
 * Shortcut: Game QR Code
 * GET /api/qr/game/:gameId
 */
const getGameQr = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { size, margin, dark, light } = req.query;
    const { buffer } = await QrService.generateEntityQr("game", gameId, { size, margin, dark, light });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Game QR Error:", error);
    return res.status(500).json({ status: "FAILED", error: "Failed to generate game QR code" });
  }
};

/**
 * Shortcut: Game Lineup QR Code
 * GET /api/qr/game/:gameId/lineup
 */
const getGameLineupQr = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { size, margin, dark, light } = req.query;
    const { buffer } = await QrService.generateEntityQr("lineup", gameId, { size, margin, dark, light });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Lineup QR Error:", error);
    return res.status(500).json({ status: "FAILED", error: "Failed to generate game lineup QR code" });
  }
};

/**
 * Shortcut: Game Stats QR Code
 * GET /api/qr/game/:gameId/stats
 */
const getGameStatsQr = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { size, margin, dark, light } = req.query;
    const { buffer } = await QrService.generateEntityQr("stats", gameId, { size, margin, dark, light });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Game Stats QR Error:", error);
    return res.status(500).json({ status: "FAILED", error: "Failed to generate game stats QR code" });
  }
};

/**
 * Shortcut: Post QR Code
 * GET /api/qr/post/:postId
 */
const getPostQr = async (req, res) => {
  try {
    const { postId } = req.params;
    const { size, margin, dark, light } = req.query;
    const { buffer } = await QrService.generateEntityQr("post", postId, { size, margin, dark, light });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Post QR Error:", error);
    return res.status(500).json({ status: "FAILED", error: "Failed to generate post QR code" });
  }
};

/**
 * Shortcut: Challenge QR Code
 * GET /api/qr/challenge/:challengeId
 */
const getChallengeQr = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { size, margin, dark, light } = req.query;
    const { buffer } = await QrService.generateEntityQr("challenge", challengeId, { size, margin, dark, light });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Challenge QR Error:", error);
    return res.status(500).json({ status: "FAILED", error: "Failed to generate challenge QR code" });
  }
};

/**
 * JSON payload QR code generator
 * POST /api/qr/generate
 */
const generateQrJson = async (req, res) => {
  try {
    const { type, id, url, text, size, margin, dark, light } = req.body;
    let targetLink = url || text;

    if (!targetLink && type && id) {
      const entity = await QrService.generateEntityQr(type, id, { size, margin, dark, light });
      targetLink = entity.link;
    }

    if (!targetLink) {
      return res.status(400).json({
        status: "FAILED",
        error: "Missing required parameters: provide 'url', 'text', or both 'type' and 'id'",
      });
    }

    const dataUrl = await QrService.generateDataUrl(targetLink, { size, margin, dark, light });
    const host = req.get("host");
    const protocol = req.protocol;
    const qrImageUrl = `${protocol}://${host}/api/qr?url=${encodeURIComponent(targetLink)}`;

    return res.status(200).json({
      status: "SUCCESS",
      link: targetLink,
      dataUrl,
      qrImageUrl,
    });
  } catch (error) {
    console.error("Generate QR JSON Error:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Failed to generate QR JSON",
      details: error.message,
    });
  }
};

/**
 * Link parser & identifier
 * GET /api/qr/parse?link=...
 * POST /api/qr/parse
 */
const parseLink = async (req, res) => {
  try {
    const link = req.query.link || req.body.link;
    if (!link) {
      return res.status(400).json({ status: "FAILED", error: "Missing 'link' parameter" });
    }

    const id = LinkUtils.getIdFromLink(link);
    const type = LinkUtils.getLinkType(link);

    return res.status(200).json({
      status: "SUCCESS",
      link,
      type,
      id,
    });
  } catch (error) {
    console.error("Parse Link Error:", error);
    return res.status(500).json({ status: "FAILED", error: "Failed to parse link" });
  }
};

module.exports = {
  getQrCode,
  getProfileQr,
  getGameQr,
  getGameLineupQr,
  getGameStatsQr,
  getPostQr,
  getChallengeQr,
  generateQrJson,
  parseLink,
};
