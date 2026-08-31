const localSearchService = require("../services/localSearch.service");

//Upload
const uploadPost = async (req, res) => {

};

const uploadHghlight = async (req, res) => {

};

const uploadThoughts = async (req, res) => {

};

const uploadGame = async (req, res) => {

};

/**
 * Local fuzzy search for posts using in-memory Fuse cache.
 * Searches caption and tags.
 * GET /api/posts/local-search
 */
const localSearchPosts = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ status: "FAILED", error: "Missing search query" });
    }

    const finalResults = await localSearchService.searchPosts(query);

    if (finalResults === null) {
      return res.status(503).json({ status: "FAILED", error: "Search index not ready. Please try again later." });
    }

    res.status(200).json({ status: "SUCCESS", data: finalResults });
  } catch (err) {
    console.error("Local post search error:", err);
    res.status(500).json({ status: "FAILED", error: "Local search failed" });
  }
};

module.exports = { 
  uploadPost, 
  uploadHghlight, 
  uploadThoughts, 
  uploadGame, 
  localSearchPosts 
};