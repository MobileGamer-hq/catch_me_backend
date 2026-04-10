const crypto = require('crypto');
const salt = "CatchMe_2026_Secure_Salt_!@#";
const password = "123456";

console.log("1. p + s:", crypto.createHash('sha256').update(password + salt).digest('hex'));
console.log("2. s + p:", crypto.createHash('sha256').update(salt + password).digest('hex'));
console.log("3. p:", crypto.createHash('sha256').update(password).digest('hex'));
console.log("4. s:", crypto.createHash('sha256').update(salt).digest('hex'));
console.log("5. s + p + s:", crypto.createHash('sha256').update(salt + password + salt).digest('hex'));
console.log("6. SHA256(p) + s:", crypto.createHash('sha256').update(crypto.createHash('sha256').update(password).digest('hex') + salt).digest('hex'));
console.log("7. p + SHA256(s):", crypto.createHash('sha256').update(password + crypto.createHash('sha256').update(salt).digest('hex')).digest('hex'));
console.log("8. SHA256(p + s):", crypto.createHash('sha256').update(password + salt).digest('hex')); // duplicate of 1
console.log("9. p + s (utf16le):", crypto.createHash('sha256').update(password + salt, 'utf16le').digest('hex'));
