const express = require("express");
const router = express.Router();

// ✅ ONLY ONE IMPORT
const { loginExam, createExamUser } = require("./examAuth.controller");

// ✅ Routes
router.post("/login", loginExam);
router.post("/create", createExamUser);

module.exports = router;