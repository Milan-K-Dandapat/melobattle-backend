const express = require("express");
const router = express.Router();
const { assignUsersToContest } = require("./examAuth.controller");
const examAuthController = require("./examAuth.controller");

// ✅ ONLY ONE IMPORT
const { loginExam, createExamUser } = require("./examAuth.controller");

// ✅ Routes
router.post("/login", loginExam);
router.post("/create", createExamUser);
router.post("/assign", assignUsersToContest);
router.get("/all", examAuthController.getAllExamUsers);
router.get("/all", async (req, res) => {
  try {
    const ExamAuth = require("./examAuth.model"); // 👈 ADD THIS LINE

    const users = await ExamAuth.find().select("-password");

    res.json({
      success: true,
      users
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
});

module.exports = router;