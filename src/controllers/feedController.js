const { generateUserFeed } = require("../services/feed.legacy");

const getUserFeed = async (req, res) => {
  try {
    const feed = await generateUserFeed(req.params.id);
    res.status(200).json(feed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

module.exports = { getUserFeed };
