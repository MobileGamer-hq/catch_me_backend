const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

/**
 * Handle generic engagement signals (dwell time, clicks, etc.)
 * POST /api/engage/signal
 * Body: { type: 'dwell'|'click', targetId: string, value: number (optional) }
 */
const recordSignal = async (req, res) => {
  try {
    const { type, targetId, value, targetType = "post" } = req.body;
    const userId = req.user?.uid; // Assuming auth middleware populates this

    if (!targetId || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const collectionName = targetType === "game" ? "events" : "posts";
    const docRef = db.collection(collectionName).doc(targetId);

    // We use a batch or direct update depending on volume.
    // For high volume, these should go to a "signals" collection or Redis queue.
    // For now, roughly direct updates.

    if (type === "dwell") {
      // value is milliseconds
      const dwellTime = parseInt(value) || 0;
      if (dwellTime > 0) {
        await docRef.update({
          totalDwellTime: FieldValue.increment(dwellTime),
          dwellCount: FieldValue.increment(1),
        });
      }
    } else if (type === "click") {
      await docRef.update({
        clickCount: FieldValue.increment(1),
      });
    }

    // Log the signal for future ML processing
    // await db.collection("signals").add({
    //     userId,
    //     targetId,
    //     type,
    //     value,
    //     timestamp: FieldValue.serverTimestamp()
    // });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Signal Error:", error);
    res.status(500).json({ error: "Failed to record signal" });
  }
};

module.exports = { recordSignal };
