const { db, admin } = require("../config/firebase");
const { Firestore } = require("../utils/db");

/**
 * Delete a post and remove all its traces from users (likedPosts, savedPosts).
 * DELETE /api/posts/:id
 */
const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check if post exists
    const post = await Firestore.getById("posts", id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const { userId } = post;

    // 2. Remove post from users' likedPosts and savedPosts
    // We find all users who have this postId in their arrays
    const usersWithLikes = await db.collection("users").where("likedPosts", "array-contains", id).get();
    const usersWithSaves = await db.collection("users").where("savedPosts", "array-contains", id).get();

    const batch = db.batch();

    usersWithLikes.forEach(doc => {
      batch.update(doc.ref, {
        likedPosts: admin.firestore.FieldValue.arrayRemove(id)
      });
    });

    usersWithSaves.forEach(doc => {
      batch.update(doc.ref, {
        savedPosts: admin.firestore.FieldValue.arrayRemove(id)
      });
    });

    // 3. Remove post from creator's posts array (if it exists)
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      batch.update(userRef, {
        posts: admin.firestore.FieldValue.arrayRemove(id)
      });
    }

    // 4. Delete the post itself
    batch.delete(db.collection("posts").doc(id));

    await batch.commit();

    res.status(200).json({ message: "Post and its traces deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ error: "Failed to delete post", details: err.message });
  }
};

module.exports = { deletePost };
