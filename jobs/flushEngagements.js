const fs = require("fs");
const path = require("path");
const admin = require("../services/firebaseAdmin");

const db = admin.db;
const FieldValue = admin.admin.firestore.FieldValue;

const ENGAGEMENT_FILE_PATH = path.join(
    __dirname,
    "../../database/tempEngagementScores.json"
);

const VIEWS_FILE_PATH = path.join(
    __dirname,
    "../../database/tempViewScores.json"
);

/**
 * Flush engagement + view deltas to Firestore
 */
const flushEngagements = async () => {
    try {
        const batch = db.batch();

        /* ------------------ ENGAGEMENT ------------------ */
        if (fs.existsSync(ENGAGEMENT_FILE_PATH)) {
            const rawEngagement = fs.readFileSync(ENGAGEMENT_FILE_PATH, "utf-8");
            const engagementData = rawEngagement ? JSON.parse(rawEngagement) : {};

            for (const key of Object.keys(engagementData)) {
                const { count, type } = engagementData[key];
                if (!count) continue;

                const id = key.split("_")[1];

                const ref =
                    type === "post"
                        ? db.collection("posts").doc(id)
                        : db.collection("events").doc(id);

                batch.update(ref, {
                    engagementScore: FieldValue.increment(count),
                });
            }
        }

        /* --------------------- VIEWS -------------------- */
        if (fs.existsSync(VIEWS_FILE_PATH)) {
            const rawViews = fs.readFileSync(VIEWS_FILE_PATH, "utf-8");
            const viewsData = rawViews ? JSON.parse(rawViews) : {};

            for (const key of Object.keys(viewsData)) {
                const { count, type } = viewsData[key];
                if (!count) continue;

                const id = key.split("_")[1];

                const ref =
                    type === "post"
                        ? db.collection("posts").doc(id)
                        : db.collection("events").doc(id);

                batch.update(ref, {
                    viewCount: FieldValue.increment(count),
                });
            }
        }

        await batch.commit();

        // Clear temp files after successful flush
        fs.writeFileSync(ENGAGEMENT_FILE_PATH, "{}");
        fs.writeFileSync(VIEWS_FILE_PATH, "{}");

        console.log("Engagements & views flushed successfully");
    } catch (err) {
        console.error("Failed to flush engagement/view data:", err.message);
    }
};

module.exports = flushEngagements;
