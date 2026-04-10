const crypto = require('crypto');
const salt = "CatchMe_2026_Secure_Salt_!@#";
console.log(crypto.createHash('sha256').update("somto123" + salt).digest('hex'));
