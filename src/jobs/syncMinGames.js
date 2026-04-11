const fs = require("fs");
const path = require("path");
const { db } = require("../config/firebase");

/**
 * Daily job to sync minified game data from Firestore to a local JSON file.
 * Includes title, sport, and tags for fuzzy search.
 */
const syncMinGames = async () => {
  try {
    console.log("Starting minified game sync...");
    
    // 1. Fetch all events of type 'game' from Firestore
    const snapshot = await db.collection("events").where("type", "==", "game").get();
    
    // 2. Transform into minified structure
    const minifiedGames = {};
    
    snapshot.forEach(doc => {
      const game = { id: doc.id, ...doc.data() };
      
      const minData = {
        id: game.id || "",
        userId: game.userId || "",
        sport: game.sport || game.data?.sport || "",
        title: game.title || "",
        date: game.date || game.data?.date || null,
        location: game.location || game.data?.location || "",
        tags: Array.isArray(game.tags) ? game.tags : (typeof game.tags === "string" ? game.tags.split(",").map(t => t.trim()) : 
              (Array.isArray(game.data?.tags) ? game.data.tags : (typeof game.data?.tags === "string" ? game.data.tags.split(",").map(t => t.trim()) : []))),
        type: "game"
      };
      
      minifiedGames[game.id] = {
        title: minData.title,
        sport: minData.sport,
        tags: minData.tags,
        data: minData
      };
    });
    
    // 3. Save to local JSON file
    const dataDir = path.join(__dirname, "..", "data");
    const filePath = path.join(dataDir, "games_min.json");
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(minifiedGames, null, 2), "utf8");
    
    console.log(`Successfully synced ${snapshot.size} games to ${filePath}`);
    return true;
  } catch (error) {
    console.error("Error in syncMinGames job:", error);
    return false;
  }
};

module.exports = syncMinGames;
