const { db } = require("../config/firebase");

/**
 * Collaborative Filtering Job through Jaccard Similarity
 *
 * Logic:
 * 1. Fetch all users and their "likedPosts".
 * 2. Compare every pair of users (expensive O(N^2), but ok for MVP).
 * 3. Calculate Jaccard Index: (Intersection of Likes) / (Union of Likes).
 * 4. Store top N similar users in `users/{id}/recommendations`.
 *
 * Run this nightly.
 */
const computeSimilarity = async () => {
  console.log("🧠 Starting Similarity Computation...");

  try {
    const snapshot = await db.collection("users").get();
    const users = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.likedPosts && data.likedPosts.length > 0) {
        users.push({ id: doc.id, likedPosts: new Set(data.likedPosts) });
      }
    });

    console.log(`Processing ${users.length} users with likes...`);

    const batch = db.batch();
    let opCount = 0;

    for (let i = 0; i < users.length; i++) {
      const u1 = users[i];
      const scores = [];

      for (let j = 0; j < users.length; j++) {
        if (i === j) continue;
        const u2 = users[j];

        // Jaccard Similarity
        const intersection = new Set(
          [...u1.likedPosts].filter((x) => u2.likedPosts.has(x)),
        );
        const union = new Set([...u1.likedPosts, ...u2.likedPosts]);

        if (union.size > 0) {
          const score = intersection.size / union.size;
          if (score > 0.1) {
            // Threshold
            scores.push({ userId: u2.id, score });
          }
        }
      }

      // Top 10 similar users
      scores.sort((a, b) => b.score - a.score);
      const topMatches = scores.slice(0, 10);

      if (topMatches.length > 0) {
        const ref = db
          .collection("users")
          .doc(u1.id)
          .collection("computed")
          .doc("similarity");
        batch.set(ref, {
          similarUsers: topMatches,
          updatedAt: new Date().toISOString(),
        });
        opCount++;
      }

      if (opCount >= 450) {
        await batch.commit();
        opCount = 0;
      }
    }

    if (opCount > 0) await batch.commit();
    console.log("✅ Similarity computation complete.");
  } catch (err) {
    console.error("Similarity Computation Failed:", err);
  }
};

module.exports = { computeSimilarity };
