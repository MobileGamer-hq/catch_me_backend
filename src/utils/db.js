const { db, realtime, admin } = require("../config/firebase");

class Firestore {
  static firestore() {
    return db;
  }
  // Get all documents in a collection
  static async getAll(collectionName) {
    const snapshot = await db.collection(collectionName).get();
    const results = [];
    snapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    return results;
  }

  // Get a single document by ID
  static async getById(collectionName, id) {
    if (!id || typeof id !== "string") return null;
    const docRef = db.collection(collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  // Get documents by list of IDs (batch fetch, max 30 per chunk)
  static async getByIds(collectionName, ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const results = [];
    for (let i = 0; i < ids.length; i += 30) {
      const chunk = ids.slice(i, i + 30);
      const snapshot = await db
        .collection(collectionName)
        .where("id", "in", chunk)
        .get();
      snapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    }
    return results;
  }

  // Get documents by role
  static async getByRole(role) {
    const snapshot = await db
      .collection("users")
      .where("role", "==", role)
      .get();
    const results = [];
    snapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    return results;
  }

  // Update a document by ID
  static async updateById(collectionName, id, data) {
    const docRef = db.collection(collectionName).doc(id);
    await docRef.update(data);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  // Delete a document by ID
  static async deleteById(collectionName, id) {
    await db.collection(collectionName).doc(id).delete();
    return { id, deleted: true };
  }

  // Create a new document (optional helper)
  static async create(collectionName, data) {
    const docRef = await db.collection(collectionName).add(data);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }
}

class Realtime {
  /**
   * Recursively sanitizes keys for RTDB by replacing invalid characters (., #, $, /, [, ]) with underscores.
   */
  static sanitizeKeys(data) {
    if (data === null || typeof data !== "object") return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeKeys(item));
    }

    const sanitized = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Replace invalid RTDB characters: . # $ / [ ]
        const sanitizedKey = key.replace(/[\.\#\$\/\\[\]]/g, "_");
        sanitized[sanitizedKey] = this.sanitizeKeys(data[key]);
      }
    }
    return sanitized;
  }

  // Set data at a reference (overwrite)
  static async set(refPath, data) {
    try {
      const sanitizedData = this.sanitizeKeys(data);
      await realtime.ref(refPath).set(sanitizedData);
      console.log(`Data saved to ${refPath}`);
      return { refPath, set: true };
    } catch (e) {
      console.error("Realtime DB Set Error:", e);
      return { refPath, set: false, error: e.message };
    }
  }

  // Push new data to a reference (adds a child)
  static async push(refPath, data) {
    const sanitizedData = this.sanitizeKeys(data);
    const ref = realtime.ref(refPath).push();
    await ref.set(sanitizedData);
    return { key: ref.key, ...sanitizedData };
  }

  // Update data at a reference
  static async update(refPath, data) {
    const sanitizedData = this.sanitizeKeys(data);
    await realtime.ref(refPath).update(sanitizedData);
    return { refPath, updated: true };
  }

  // Delete data at a reference
  static async delete(refPath) {
    await realtime.ref(refPath).remove();
    return { refPath, deleted: true };
  }
}

module.exports = { Firestore, Realtime };
