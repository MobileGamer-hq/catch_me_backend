const fs = require("fs");
const path = require("path");
const {db} = require("../services/firebaseAdmin");

const FILE_PATH = path.join(
    __dirname,
    "../../database/tempEngagementScores.json"
);

const flushEngagements = async () => {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    if (!raw) return;

    const data = JSON.parse(raw);
    const keys = Object.keys(data);

    if (keys.length === 0) return;

    const batch = db.batch();

    for (const key of keys) {
        const { count, type } = data[key];
        const id = key.split("_")[1];

        const ref =
            type === "post"
                ? db.collection("posts").doc(id)
                : db.collection("games").doc(id);

        batch.update(ref, {
            engagementScore: db.FieldValue.increment(count),
        });
    }

    await batch.commit();

    // clear file after flush
    fs.writeFileSync(FILE_PATH, "{}");

    console.log("Engagements flushed successfully");
};

module.exports = flushEngagements;
