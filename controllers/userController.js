const User = require("../models/userModel");

const createUser = async (req, res) => {
  try {
    const data = req.body;
    const user = await User.create(data);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
};

module.exports = { createUser, getUser };
