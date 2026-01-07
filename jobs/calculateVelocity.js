const { db } = require("../services/firebaseAdmin");

/**
 * Calculate engagement velocity for recent posts
 * Velocity = change in engagement score per hour
 * 
 * This helps identify trending content that's gaining traction quickly
 */
async function calculateEngagementVelocity() {
    try {
        console.log("📊 Calculating engagement velocity...");

        // Get posts from last 48 hours
        const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
        
        const postsSnapshot = await db.collection("posts")
            .where("createdAt", ">", new Date(twoDaysAgo).toISOString())
            .get();

        const batch = db.batch();
        let count = 0;

        for (const doc of postsSnapshot.docs) {
            const post = doc.data();
            const engagementHistory = post.engagementHistory || [];

            // Add current snapshot to history
            const currentSnapshot = {
                timestamp: Date.now(),
                score: post.engagementScore || 0
            };

            // Keep only last 24 snapshots (24 hours if run hourly)
            const updatedHistory = [...engagementHistory, currentSnapshot].slice(-24);

            // Calculate velocity if we have at least 2 data points
            let velocity = 0;
            if (updatedHistory.length >= 2) {
                const latest = updatedHistory[updatedHistory.length - 1];
                const previous = updatedHistory[updatedHistory.length - 2];

                const timeDiffHours = (latest.timestamp - previous.timestamp) / (1000 * 60 * 60);
                const scoreDiff = latest.score - previous.score;

                if (timeDiffHours > 0) {
                    velocity = scoreDiff / timeDiffHours;
                }
            }

            // Update post with new history and velocity
            batch.update(doc.ref, {
                engagementHistory: updatedHistory,
                velocity: Math.max(0, velocity) // Don't allow negative velocity
            });

            count++;

            // Firestore batch limit is 500
            if (count >= 450) {
                await batch.commit();
                console.log(`✅ Updated velocity for ${count} posts`);
                return;
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`✅ Updated velocity for ${count} posts`);
        } else {
            console.log("ℹ️  No recent posts to update");
        }

    } catch (err) {
        console.error("❌ Failed to calculate engagement velocity:", err.message);
    }
}

module.exports = calculateEngagementVelocity;
