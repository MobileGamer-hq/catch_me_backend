const express = require("express");
const router = express.Router();
const {  getUser, deleteUser, searchUsers, getUsers } = require("../controllers/userController");

//User
router.get("/", getUsers); // get all users
router.get("/:id", getUser); //
router.delete('/:id', deleteUser ); //
router.get('/search', searchUsers) //search users by name, email, etc.



module.exports = router;
