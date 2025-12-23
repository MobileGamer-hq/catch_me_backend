const express = require("express");
const {getUserFeed} = require("../controllers/feedController");
const {increaseEngagement, getEngagementById, getAllEngagements} = require("../controllers/social/engagementContoroller");
const router = express.Router();

//User
router.post("/:id", increaseEngagement);
router.get("/:id", getEngagementById);
router.get("/", getAllEngagements);



module.exports = router;
