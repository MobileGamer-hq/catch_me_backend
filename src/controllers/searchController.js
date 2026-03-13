const SearchService = require("../services/search.service");

/**
 * Global search endpoint handler.
 * GET /api/search?q={query}
 */
const searchAll = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Missing search query" });
    }

    const results = await SearchService.globalSearch(q);
    res.status(200).json(results);
  } catch (error) {
    console.error("[SearchController] Search error:", error);
    res.status(500).json({ error: "Search failed", details: error.message });
  }
};

module.exports = { searchAll };
