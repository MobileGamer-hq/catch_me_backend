const express = require("express");
const router = express.Router();
const { createUser, getUser } = require("../controllers/userController");

//User
router.post("/create", createUser);
router.get("/:id", getUser);

//Users


module.exports = router;
