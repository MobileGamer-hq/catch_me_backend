const { FeedSystem } = require("./services/feed.service");
const { Firestore } = require("./utils/db");
const fs = require("fs");
const path = require("path");

async function testSuggestedUsers() {
  console.log("🚀 Starting Feed Recommendation Test...");

  try {
    // 1. Load sample user
    const userPath = path.join(__dirname, "..", "user.json");
    const userData = JSON.parse(fs.readFileSync(userPath, "utf8"));
    console.log(`Loaded user: ${userData.id} (${userData.role})`);

    // 2. Initialize FeedSystem
    const feedSystem = new FeedSystem(userData);

    // 3. Test fetchSuggestedUsers directly first
    console.log("Checking fetchSuggestedUsers...");
    const suggested = await feedSystem.fetchSuggestedUsers();
    console.log("Suggested Users Categories:", Object.keys(suggested));

    for (const role in suggested) {
      console.log(`- ${role}: ${suggested[role].length} users`);
      if (suggested[role].length > 0) {
        console.log(
          `  Sample: ${suggested[role][0].displayName} (${suggested[role][0].id})`,
        );
      }
    }

    // 4. Test generateFeed
    console.log("\nChecking generateFeed...");
    const feed = await feedSystem.generateFeed();

    if (feed.suggestedUsers) {
      console.log("✅ suggestedUsers found in feed response");
      console.log(
        "Structure:",
        JSON.stringify(feed.suggestedUsers, null, 2).slice(0, 500) + "...",
      );
    } else {
      console.log("❌ suggestedUsers NOT found in feed response");
    }

    process.exit(0);
  } catch (error) {
    console.error("Test Failed:", error);
    process.exit(1);
  }
}

testSuggestedUsers();
