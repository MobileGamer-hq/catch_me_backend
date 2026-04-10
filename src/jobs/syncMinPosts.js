const fs = require("fs");
const path = require("path");
const { Firestore } = require("../utils/db");

/**
 * Daily job to sync minified post data from Firestore to a local JSON file.
 * Includes caption and tags for fuzzy search.
 */
const syncMinPosts = async () => {
  try {
    console.log("Starting minified post sync...");
    
    // 1. Fetch all posts from Firestore
    const posts = await Firestore.getAll("posts");
    
    // 2. Transform into minified structure
    const minifiedPosts = {};
    
    posts.forEach(post => {
      const minData = {
        id: post.id || "",
        userId: post.userId || "",
        type: post.type || "",
        caption: post.data?.caption || "",
        tags: Array.isArray(post.tags) ? post.tags : (typeof post.tags === "string" ? post.tags.split(",").map(t => t.trim()) : []),
        pic: post.userInfo?.pic || "",
        name: post.userInfo?.name || ""
      };
      
      minifiedPosts[post.id] = {
        caption: minData.caption,
        tags: minData.tags,
        data: minData
      };
    });
    
    // 3. Save to local JSON file
    const dataDir = path.join(__dirname, "..", "data");
    const filePath = path.join(dataDir, "posts_min.json");
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(minifiedPosts, null, 2), "utf8");
    
    console.log(`Successfully synced ${posts.length} posts to ${filePath}`);
    return true;
  } catch (error) {
    console.error("Error in syncMinPosts job:", error);
    return false;
  }
};

module.exports = syncMinPosts;
