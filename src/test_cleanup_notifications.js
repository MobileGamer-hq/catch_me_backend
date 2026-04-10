const { db } = require("./config/firebase");
const cleanupNotificationsJob = require("./jobs/cleanupNotifications");

async function testCleanupNotifications() {
  console.log("🚀 Starting Notification Cleanup Test...");

  const testUserId = "test-user-cleanup-" + Date.now();
  const testUserRef = db.collection("users").doc(testUserId);

  try {
    // 1. Create a test user with 35 notifications
    console.log("Creating test user with 35 notifications...");
    const notifications = [];
    for (let i = 1; i <= 35; i++) {
        notifications.push({
            id: `notif-${i}`,
            title: `Notification ${i}`,
            sentAt: Date.now() + i * 1000 // Ensure unique and sorted sentAt
        });
    }

    // Shuffle notifications to test sorting
    const shuffledNotifications = [...notifications].sort(() => Math.random() - 0.5);

    await testUserRef.set({
      id: testUserId,
      username: "testcleanup",
      notifications: shuffledNotifications
    });

    console.log("Test user created. Running cleanup job...");

    // 2. Run the cleanup job
    // Note: The job processes all users. In a real test we might want to isolate, 
    // but for this simple script it's fine as long as we check our specific user.
    await cleanupNotificationsJob();

    // 3. Verify results
    const updatedUserDoc = await testUserRef.get();
    const updatedNotifications = updatedUserDoc.data().notifications;

    console.log(`Initial count: 35`);
    console.log(`Updated count: ${updatedNotifications.length}`);

    if (updatedNotifications.length === 15) {
      console.log("✅ SUCCESS: Notification count is 15.");
      
      // Verify that the oldest 20 were removed (IDs should be from notif-21 to notif-35)
      const ids = updatedNotifications.map(n => n.id);
      const expectedIds = notifications.slice(20).map(n => n.id);
      
      const allExpectedPresent = expectedIds.every(id => ids.includes(id));
      if (allExpectedPresent) {
          console.log("✅ SUCCESS: The oldest 20 notifications were correctly removed.");
      } else {
          console.error("❌ FAILURE: The wrong notifications were removed.");
          console.log("Actual IDs:", ids);
          console.log("Expected IDs after cleanup:", expectedIds);
      }
    } else {
      console.error(`❌ FAILURE: Expected 15 notifications, but got ${updatedNotifications.length}.`);
    }

  } catch (error) {
    console.error("Test Failed:", error);
  } finally {
    // 4. Cleanup
    console.log("Cleaning up test user...");
    await testUserRef.delete();
    process.exit(0);
  }
}

testCleanupNotifications();
