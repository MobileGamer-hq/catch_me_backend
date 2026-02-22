const fs = require("fs");
const path = require("path");
const admin = require("../config/firebase");

const db = admin.db;
const FieldValue = admin.admin.firestore.FieldValue;

const ENGAGEMENT_FILE_PATH = path.join(
  __dirname,
  "../database/tempEngagementScores.json",
);

const VIEWS_FILE_PATH = path.join(__dirname, "../database/tempViewScores.json");

// Engagement weights (must match FeedSystem)
const ENGAGEMENT_WEIGHTS = {
  view: 1,
  like: 2,
  comment: 4,
  share: 6,
  save: 5,
};

/**
 * Flush engagement + view deltas to Firestore
 * Also recalculates engagement scores based on current data
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

    console.log("✅ Engagements & views flushed successfully");

    // Recalculate engagement scores for recently updated posts
    await recalculateEngagementScores();
  } catch (err) {
    console.error("❌ Failed to flush engagement/view data:", err.message);
  }
};

/**
 * Recalculate engagement scores based on weighted formula
 * This ensures scores match the FeedSystem's expectations
 */
async function recalculateEngagementScores() {
  try {
    // Get recently updated posts (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const postsSnapshot = await db
      .collection("posts")
      .where("updatedAt", ">", new Date(oneDayAgo).toISOString())
      .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of postsSnapshot.docs) {
      const post = doc.data();

      // Calculate weighted engagement score
      const viewCount = post.viewCount || 0;
      const likes = Array.isArray(post.likes) ? post.likes.length : 0;
      const comments = Array.isArray(post.comments) ? post.comments.length : 0;
      const shares = Array.isArray(post.shares) ? post.shares.length : 0;
      const saves = Array.isArray(post.saves) ? post.saves.length : 0;

      const calculatedScore =
        viewCount * ENGAGEMENT_WEIGHTS.view +
        likes * ENGAGEMENT_WEIGHTS.like +
        comments * ENGAGEMENT_WEIGHTS.comment +
        shares * ENGAGEMENT_WEIGHTS.share +
        saves * ENGAGEMENT_WEIGHTS.save;

      // Only update if score changed significantly
      if (Math.abs(calculatedScore - (post.engagementScore || 0)) > 1) {
        batch.update(doc.ref, { engagementScore: calculatedScore });
        count++;
      }

      // Firestore batch limit is 500
      if (count >= 450) break;
    }

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Recalculated ${count} engagement scores`);
    }
  } catch (err) {
    console.error("❌ Failed to recalculate engagement scores:", err.message);
  }
}

module.exports = flushEngagements;
