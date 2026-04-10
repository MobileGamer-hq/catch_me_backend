const Fuse = require("fuse.js");
const fs = require("fs");
const path = require("path");

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
 * Local fuzzy search for posts using minified JSON file.
 * Searches caption and tags.
 * GET /api/posts/local-search
 */
const localSearchPosts = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Missing search query" });
    }

    const filePath = path.join(__dirname, "..", "data", "posts_min.json");

    if (!fs.existsSync(filePath)) {
      return res.status(503).json({ error: "Search index not ready. Please try again later." });
    }

    const fileData = fs.readFileSync(filePath, "utf8");
    const minPostsMap = JSON.parse(fileData);

    // Convert map to array for Fuse.js
    const postsArray = Object.values(minPostsMap).map(p => p.data);

    const fuseOptions = {
      keys: ["caption", "tags"],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 2,
    };

    const fuse = new Fuse(postsArray, fuseOptions);
    const results = fuse.search(query);

    const finalResults = results.map(r => r.item);

    res.status(200).json(finalResults);
  } catch (err) {
    console.error("Local post search error:", err);
    res.status(500).json({ error: "Local search failed" });
  }
};

module.exports = { 
  uploadPost, 
  uploadHghlight, 
  uploadThoughts, 
  uploadGame, 
  localSearchPosts 
};