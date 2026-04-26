const express = require("express");
const router = express.Router();

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