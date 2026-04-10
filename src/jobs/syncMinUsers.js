const fs = require("fs");
const path = require("path");
const { Firestore } = require("../utils/db");

/**
 * Daily job to sync minified user data from Firestore to a local JSON file.
 * This file is used for high-performance fuzzy search on the backend.
 */
const syncMinUsers = async () => {
  try {
    console.log("Starting minified user sync...");
    
    // 1. Fetch all users from Firestore
    // Note: If the user count grows extremely high, consider using pagination/streaming
    const users = await Firestore.getAll("users");
    
    // 2. Transform into the requested minified structure
    const minifiedUsers = {};
    
    users.forEach(user => {
      const minData = {
        id: user.id || "",
        username: user.username || "",
        name: user.name || "",
        profilePic: user.profilePic || "",
        role: user.role || ""
      };
      
      minifiedUsers[user.id] = {
        username: minData.username,
        name: minData.name,
        data: minData
      };
    });
    
    // 3. Save to local JSON file
    const dataDir = path.join(__dirname, "..", "data");
    const filePath = path.join(dataDir, "users_min.json");
    
    // Ensure directory exists (double check)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(minifiedUsers, null, 2), "utf8");
    
    console.log(`Successfully synced ${users.length} users to ${filePath}`);
    return true;
  } catch (error) {
    console.error("Error in syncMinUsers job:", error);
    return false;
  }
};

module.exports = syncMinUsers;
