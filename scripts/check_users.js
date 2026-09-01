require("dotenv").config();
const { db } = require("../src/config/firebase");

async function checkUsers() {
  const snap = await db.collection("users").limit(5).get();
  console.log("Found users in collection 'users':", snap.size);
  snap.forEach(doc => {
    console.log("Doc ID:", doc.id, "Data:", { username: doc.data().username, name: doc.data().name, id: doc.data().id });
  });
  process.exit(0);
}

checkUsers();
