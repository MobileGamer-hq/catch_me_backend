const { db, admin } = require("../config/firebase");

// XP Multipliers
const XP_PER_GAME = 25;
const XP_PER_POST = 10;
const XP_PER_FOLLOWER = 0.1; // 10 followers = 1 XP

function calculateLevel(xp) {
    if (xp >= 250000) return 'goat';
    if (xp >= 75000) return 'mvp';
    if (xp >= 20000) return 'allStar';
    if (xp >= 5000) return 'starter';
    if (xp >= 1000) return 'prospect';
    return 'rookie';
}

function calculateNextLevelXP(xp) {
    if (xp < 1000) return 1000;
    if (xp < 5000) return 5000;
    if (xp < 20000) return 20000;
    if (xp < 75000) return 75000;
    if (xp < 250000) return 250000;
    return -1; // -1 means max level (goat) reached
}

/**
 * Executes the daily XP calculation for all users.
 */
const calculateXPJob = async () => {
    console.log(`[${new Date().toISOString()}] Starting scheduled XP calculation...`);
    try {
        const usersSnapshot = await db.collection('users').get();
        let updatedCount = 0;
        
        let batch = db.batch();
        let operationCount = 0;

        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();

            // Calculate stats based on arrays in the user schema
            const gamesCount = (userData.games ? userData.games.length : 0) + (userData.myGames ? userData.myGames.length : 0);
            const postsCount = userData.posts ? userData.posts.length : 0;
            const followersCount = userData.followers ? userData.followers.length : 0;

            // Calculate new XP (Math.floor ensures we save it as an integer)
            const newXP = Math.floor(
                (gamesCount * XP_PER_GAME) + 
                (postsCount * XP_PER_POST) + 
                (followersCount * XP_PER_FOLLOWER)
            );

            // Determine level
            const newLevel = calculateLevel(newXP);
            const nextLevelXP = calculateNextLevelXP(newXP);

            // Add to batch update
            batch.update(doc.ref, {
                experiencePoints: newXP,
                xp: newXP,
                level: newLevel,
                nextLevelXP: nextLevelXP,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            updatedCount++;
            operationCount++;

            // Firestore batches have a limit of 500 operations
            if (operationCount >= 450) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        }
        
        if (operationCount > 0) {
            await batch.commit();
        }

        console.log(`[${new Date().toISOString()}] XP calculation completed: ${updatedCount} users updated.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Scheduled XP calculation failed:`, error);
    }
};

module.exports = calculateXPJob;
