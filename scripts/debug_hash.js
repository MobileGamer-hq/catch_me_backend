const crypto = require('crypto');
const salt = "CatchMe_2026_Secure_Salt_!@#";
const password = "123456";

console.log("password + salt:", crypto.createHash('sha256').update(password + salt).digest('hex'));
console.log("salt + password:", crypto.createHash('sha256').update(salt + password).digest('hex'));
console.log("password alone:", crypto.createHash('sha256').update(password).digest('hex'));
console.log("salt alone:", crypto.createHash('sha256').update(salt).digest('hex'));
