const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../src/config/firebase');

const SALT = "CatchMe_2026_Secure_Salt_!@#";
const BACKUP_FILE = path.join(__dirname, '../users_backup.json');
const MIGRATED_FILE = path.join(__dirname, '../users_migrated.json');

/**
 * Hashing algorithm: Hex(SHA256(password + salt))
 */
function hashPassword(password) {
    if (!password) return null;
    return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

async function runMigration() {
    console.log("--- Starting User Data Migration ---");
    
    // Test the hashing algorithm with user's example
    const testPassword = "123456";
    const expectedPrefix = "c9c";
    const testHash = hashPassword(testPassword);
    console.log(`Test Hashing: "${testPassword}" -> ${testHash}`);
    if (testHash.startsWith(expectedPrefix)) {
        console.log("✅ Hashing algorithm verified against example.");
    } else {
        console.warn("⚠️ Hashing algorithm does not match expected example prefix 'c9c'. Double check requirements.");
    }

    try {
        console.log("Fetching all users from Firestore...");
        const snapshot = await db.collection('users').get();
        const users = [];
        
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Total users found: ${users.length}`);

        // Step 1: Save to JSON file (Backup)
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(users, null, 2));
        console.log(`✅ All user data saved to ${BACKUP_FILE}`);

        // Step 2: Hash passwords and update Firestore
        console.log("Starting password hashing and Firestore updates...");
        const updatedUsers = [];
        let updatedCount = 0;

        for (const user of users) {
            // Check if user has a password and if it's not already hashed (assuming plain text for now as per request)
            // If the password is already 64 chars hex, we might want to skip it, 
            // but the user said "hash all the passwords for every user", 
            // so we assume they are currently plain text or need new hashing.
            
            if (user.password && typeof user.password === 'string' && user.password.length > 0) {
                // If it looks like it's already hashed (64 chars hex), maybe log it?
                // For this migration, we'll follow the instruction to hash them.
                
                const hashedPassword = hashPassword(user.password);
                
                console.log(`Updating user ${user.id} (${user.username || user.email})...`);
                
                await db.collection('users').doc(user.id).update({
                    password: hashedPassword,
                    updatedAt: new Date().toISOString() // Optional: track when migration happened
                });

                updatedUsers.push({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    oldPassword: user.password,
                    newPassword: hashedPassword
                });
                updatedCount++;
            } else {
                console.log(`Skipping user ${user.id} - no password found or invalid format.`);
            }
        }

        // Step 3: Save migrated summary to JSON
        fs.writeFileSync(MIGRATED_FILE, JSON.stringify(updatedUsers, null, 2));
        console.log(`✅ Migration complete. ${updatedCount} users updated.`);
        console.log(`✅ Migrated summary saved to ${MIGRATED_FILE}`);

    } catch (error) {
        console.error("❌ Error during migration:", error);
    } finally {
        console.log("--- Migration Process Finished ---");
        process.exit();
    }
}

runMigration();
