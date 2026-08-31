const fs = require("fs");
const path = require("path");
const admin = require("../config/firebase");
const { Cache } = require("../utils/cache");

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

const BUFFER_VIEWS_KEY = "buffer:views";
const BUFFER_ENGAGEMENTS_KEY = "buffer:engagements";

/**
 * Flush engagement + view deltas from Redis hashes to Firestore
 * Also recalculates engagement scores based on current data
 */
const flushEngagements = async () => {
  try {
    const batch = db.batch();
    let pendingUpdates = 0;

    /* ------------------ REDIS BUFFER: ENGAGEMENT ------------------ */
    const rawEngagements = await Cache.hgetall(BUFFER_ENGAGEMENTS_KEY);
    const engagementKeys = Object.keys(rawEngagements);

    if (engagementKeys.length > 0) {
      // Clear Redis buffer for engagements
      await Cache.del(BUFFER_ENGAGEMENTS_KEY);

      for (const key of engagementKeys) {
        const count = parseInt(rawEngagements[key], 10);
        if (!count || isNaN(count)) continue;

        const parts = key.split("_");
        const type = parts[0];
        const id = parts.slice(1).join("_");

        const ref =
          type === "post"
            ? db.collection("posts").doc(id)
            : db.collection("events").doc(id);

        batch.set(
          ref,
          {
            engagementScore: FieldValue.increment(count),
          },
          { merge: true },
        );
        pendingUpdates++;
      }
    }

    /* --------------------- REDIS BUFFER: VIEWS -------------------- */
    const rawViews = await Cache.hgetall(BUFFER_VIEWS_KEY);
    const viewKeys = Object.keys(rawViews);

    if (viewKeys.length > 0) {
      // Clear Redis buffer for views
      await Cache.del(BUFFER_VIEWS_KEY);

      for (const key of viewKeys) {
        const count = parseInt(rawViews[key], 10);
        if (!count || isNaN(count)) continue;

        const parts = key.split("_");
        const type = parts[0];
        const id = parts.slice(1).join("_");

        const ref =
          type === "post"
            ? db.collection("posts").doc(id)
            : db.collection("events").doc(id);

        batch.set(
          ref,
          {
            viewCount: FieldValue.increment(count),
          },
          { merge: true },
        );
        pendingUpdates++;
      }
    }

    /* --------------------- LEGACY DISK FILES (MIGRATION FALLBACK) -------------------- */
    if (fs.existsSync(ENGAGEMENT_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(ENGAGEMENT_FILE_PATH, "utf-8");
        const fileData = raw ? JSON.parse(raw) : {};
        for (const key of Object.keys(fileData)) {
          const { count, type } = fileData[key];
          if (!count) continue;
          const id = key.split("_").slice(1).join("_");
          const ref = type === "post" ? db.collection("posts").doc(id) : db.collection("events").doc(id);
          batch.set(ref, { engagementScore: FieldValue.increment(count) }, { merge: true });
          pendingUpdates++;
        }
        fs.writeFileSync(ENGAGEMENT_FILE_PATH, "{}");
      } catch (e) {
        console.warn("Legacy engagement file read failed:", e.message);
      }
    }

    if (fs.existsSync(VIEWS_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(VIEWS_FILE_PATH, "utf-8");
        const fileData = raw ? JSON.parse(raw) : {};
        for (const key of Object.keys(fileData)) {
          const { count, type } = fileData[key];
          if (!count) continue;
          const id = key.split("_").slice(1).join("_");
          const ref = type === "post" ? db.collection("posts").doc(id) : db.collection("events").doc(id);
          batch.set(ref, { viewCount: FieldValue.increment(count) }, { merge: true });
          pendingUpdates++;
        }
        fs.writeFileSync(VIEWS_FILE_PATH, "{}");
      } catch (e) {
        console.warn("Legacy view file read failed:", e.message);
      }
    }

    if (pendingUpdates > 0) {
      await batch.commit();
      console.log(`✅ Flushed ${pendingUpdates} engagement & view updates to Firestore`);
    } else {
      console.log("ℹ️ No pending engagements or views to flush");
    }

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
