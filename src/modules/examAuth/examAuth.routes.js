const express = require("express");
const router = express.Router();
const examAuthController = require("./examAuth.controller");

// ✅ ONLY ONE IMPORT
const { 
  loginExam, 
  createExamUser, 
  getUsersByContest,
  deleteExamUser   // 🔥 ADD THIS
} = require("./examAuth.controller");

// ✅ Routes
router.post("/login", loginExam);
router.post("/create", createExamUser);
router.get("/:contestId", getUsersByContest);
router.delete("/:id", deleteExamUser);

module.exports = router;