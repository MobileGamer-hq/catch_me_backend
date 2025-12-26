const fs = require("fs");
const path = require("path");

const ENGAGEMENT_FILE_PATH = path.join(
    __dirname,
    "../../database/tempEngagementScores.json"
);

const VIEWS_FILE_PATH = path.join(
    __dirname,
    "../../database/tempViewScores.json"
);

/**
 * Utility: read temp file safely
 */
const readTempFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    return raw ? JSON.parse(raw) : {};
};

/**
 * Utility: write temp file
 */
const writeTempFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

/**
 * Track views + engagement (cached locally)
 */
const increaseEngagement = async (req, res) => {
    try {
        const { type, viewerId, ownerId } = req.body;
        const { id } = req.params;

        if (!type || !id || !viewerId || !ownerId) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const key = `${type}_${id}`;

        /* ------------------ VIEWS (always count) ------------------ */
        const viewsData = readTempFile(VIEWS_FILE_PATH);

        if (!viewsData[key]) {
            viewsData[key] = { count: 0, type };
        }

        viewsData[key].count += 1;
        writeTempFile(VIEWS_FILE_PATH, viewsData);

        console.log("View cached");

        /* ---------------- ENGAGEMENT (ignore self) ---------------- */
        if (viewerId !== ownerId) {
            const engagementData = readTempFile(ENGAGEMENT_FILE_PATH);

            if (!engagementData[key]) {
                engagementData[key] = { count: 0, type };
            }

            engagementData[key].count += 1;
            writeTempFile(ENGAGEMENT_FILE_PATH, engagementData);

            console.log("Engagement cached");
        }

        res.status(200).json({
            message: "View tracked",
            engagementTracked: viewerId !== ownerId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to track engagement/view" });
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
            return res.status(400).json({ error: "Missing type or id" });
        }

        const data = readTempFile(ENGAGEMENT_FILE_PATH);
        const key = `${type}_${id}`;

        res.status(200).json({
            id,
            type,
            count: data[key]?.count || 0,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch engagement" });
    }
};

/**
 * Get all cached engagement deltas
 */
const getAllEngagements = async (req, res) => {
    try {
        const data = readTempFile(ENGAGEMENT_FILE_PATH);

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
