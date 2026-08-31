const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { Cache } = require("../utils/cache");

/**
 * Handle generic engagement signals (dwell time, clicks, views, etc.)
 * POST /api/engage/signal
 * Body: { type: 'dwell'|'click'|'view', targetId: string, value: number (optional), targetType: 'post'|'game' }
 */
const recordSignal = async (req, res) => {
  try {
    const { type, targetId, value, targetType = "post" } = req.body;

    if (!targetId || !type) {
      return res.status(400).json({ status: "FAILED", error: "Missing required fields" });
    }

    const key = `${targetType}_${targetId}`;

    if (type === "view") {
      await Cache.hincrby("buffer:views", key, 1);
    } else if (type === "dwell") {
      // value is milliseconds
      const dwellTime = parseInt(value, 10) || 0;
      if (dwellTime > 0) {
        const collectionName = targetType === "game" ? "events" : "posts";
        const docRef = db.collection(collectionName).doc(targetId);
        await docRef.update({
          totalDwellTime: FieldValue.increment(dwellTime),
          dwellCount: FieldValue.increment(1),
        });
      }
    } else if (type === "click") {
      const collectionName = targetType === "game" ? "events" : "posts";
      const docRef = db.collection(collectionName).doc(targetId);
      await docRef.update({
        clickCount: FieldValue.increment(1),
      });
    }

    res.status(200).json({ status: "SUCCESS", message: "Signal recorded successfully" });
  } catch (error) {
    console.error("Signal Error:", error);
    res.status(500).json({ status: "FAILED", error: "Failed to record signal" });
  }
};

module.exports = { recordSignal };
