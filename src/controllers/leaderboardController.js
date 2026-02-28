const { LeaderboardService } = require("../services/leaderboard.service");

/**
 * Get the ranking of users based on filters.
 * GET /api/leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const { role, country, location, region, sport, limit, page } = req.query;

    const filters = { role, country, location, region, sport };
    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedPage = parseInt(page, 10) || 1;

    // Filter out undefined values
    Object.keys(filters).forEach(
      (key) => filters[key] === undefined && delete filters[key],
    );

    const rankings = await LeaderboardService.getRankings(
      filters,
      parsedLimit,
      parsedPage,
    );

    res.status(200).json(rankings);
  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

module.exports = { getLeaderboard };
