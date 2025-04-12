const admin = require("../services/firebaseAdmin");
const db = admin.firestore();

const usersRef = db.collection("users");

const User = {
  create: async (data) => {
    const newUser = await usersRef.add(data);
    return { id: newUser.id, ...data };
  },

  getById: async (id) => {
    const doc = await usersRef.doc(id).get();
    if (!doc.exists) throw new Error("Not found");
    return { id: doc.id, ...doc.data() };
  },
};

module.exports = User;
