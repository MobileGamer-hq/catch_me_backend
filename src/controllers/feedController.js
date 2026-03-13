const { generateUserFeed } = require("../services/feed.legacy");

const getUserFeed = async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    const feed = await generateUserFeed(req.params.id, filter);
    res.status(200).json(feed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user feed" });
  }
};

module.exports = { getUserFeed };
