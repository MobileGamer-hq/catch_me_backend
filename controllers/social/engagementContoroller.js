const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(
    __dirname,
    "../../database/tempEngagementScores.json"
);

/**
 * Utility: read temp engagement file safely
 */
const readTempFile = () => {
    if (!fs.existsSync(FILE_PATH)) {
        return {};
    }

    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    return raw ? JSON.parse(raw) : {};
};

/**
 * Utility: write temp engagement file
 */
const writeTempFile = (data) => {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
};

/**
 * Increase engagement (cached locally)
 */
const increaseEngagement = async (req, res) => {
    try {
        const id = req.params.id;
        const { type, viewerId, ownerId } = req.body;

        console.log(id, type, viewerId, ownerId);

        if (!type || !id || !viewerId || !ownerId) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // Ignore self engagement
        if (viewerId === ownerId) {
            return res.status(200).json({ message: "Self engagement ignored" });
        }

        const data = readTempFile();
        const key = `${type}_${id}`;

        if (!data[key]) {
            data[key] = { count: 0, type };
        }

        data[key].count += 1;

        writeTempFile(data);

        res.status(200).json({ message: "Engagement cached" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to increase engagement" });
    }
};

/**
 * Get temp engagement delta for a specific post/game
 * GET /engagement/:type/:id
 */
const getEngagementById = async (req, res) => {
    try {
        const id = req.params.id;
        const type  = req.body.type;

        console.log(id, type);

        if (!type || !id) {
            return res.status(400).json({ error: "Missing type or id" });
        }

        const data = readTempFile();
        const key = `${type}_${id}`;

        const engagement = data[key] || { count: 0, type };

        res.status(200).json({
            id,
            type,
            count: engagement.count,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch engagement" });
    }
};

/**
 * Get all cached engagement deltas
 * GET /engagement
 */
const getAllEngagements = async (req, res) => {
    try {
        const data = readTempFile();

        res.status(200).json({
            totalItems: Object.keys(data).length,
            engagements: data,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch engagements" });
    }
};

module.exports = {
    increaseEngagement,
    getEngagementById,
    getAllEngagements,
};
