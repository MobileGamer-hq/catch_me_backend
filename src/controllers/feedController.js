const { generateUserFeed, getGranularContent } = require("../services/feed.legacy");

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

const getGranularFeed = async (req, res) => {
  try {
    const { id, type, subtype } = req.params;
    const filter = req.query.filter || "all";
    const content = await getGranularContent(id, type, filter, subtype);
    res.status(200).json(content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Failed to fetch granular feed: ${req.params.type}` });
  }
};

module.exports = { getUserFeed, getGranularFeed };
