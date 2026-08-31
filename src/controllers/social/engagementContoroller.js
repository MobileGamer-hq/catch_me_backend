const { Cache } = require("../../utils/cache");

const BUFFER_VIEWS_KEY = "buffer:views";
const BUFFER_ENGAGEMENTS_KEY = "buffer:engagements";

/**
 * Track views + engagement (buffered in Redis)
 */
const increaseEngagement = async (req, res) => {
  try {
    const { type, viewerId, ownerId } = req.body;
    const { id } = req.params;

    if (!type || !id || !viewerId || !ownerId) {
      return res.status(400).json({ status: "FAILED", error: "Missing fields" });
    }

    const key = `${type}_${id}`;

    /* ------------------ VIEWS (always count) ------------------ */
    await Cache.hincrby(BUFFER_VIEWS_KEY, key, 1);

    /* ---------------- ENGAGEMENT (ignore self) ---------------- */
    const isEngagement = viewerId !== ownerId;
    if (isEngagement) {
      await Cache.hincrby(BUFFER_ENGAGEMENTS_KEY, key, 1);
    }

    res.status(200).json({
      status: "SUCCESS",
      message: "View tracked",
      engagementTracked: isEngagement,
    });
  } catch (err) {
    console.error("increaseEngagement ERROR:", err);
    res.status(500).json({ status: "FAILED", error: "Failed to track engagement/view" });
  }
};

/**
 * Get temp engagement delta for a specific post/game
 * GET /engagement/:id?type=post
 */
const getEngagementById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!type || !id) {
      return res.status(400).json({ status: "FAILED", error: "Missing type or id" });
    }

    const key = `${type}_${id}`;
    const rawVal = await Cache.hget(BUFFER_ENGAGEMENTS_KEY, key);

    res.status(200).json({
      status: "SUCCESS",
      id,
      type,
      count: parseInt(rawVal, 10) || 0,
    });
  } catch (err) {
    console.error("getEngagementById ERROR:", err);
    res.status(500).json({ status: "FAILED", error: "Failed to fetch engagement" });
  }
};

/**
 * Get all cached engagement deltas
 */
const getAllEngagements = async (req, res) => {
  try {
    const data = await Cache.hgetall(BUFFER_ENGAGEMENTS_KEY);
    const engagements = {};

    for (const [key, val] of Object.entries(data)) {
      const parts = key.split("_");
      const type = parts[0];
      engagements[key] = {
        count: parseInt(val, 10) || 0,
        type,
      };
    }

    res.status(200).json({
      status: "SUCCESS",
      totalItems: Object.keys(engagements).length,
      engagements,
    });
  } catch (err) {
    console.error("getAllEngagements ERROR:", err);
    res.status(500).json({ status: "FAILED", error: "Failed to fetch engagements" });
  }
};

module.exports = {
  increaseEngagement,
  getEngagementById,
  getAllEngagements,
};
