const express = require("express");
const router = express.Router();
const compilerController = require("./compiler.controller");
const { protect } = require("../../middleware/auth.middleware");

// Run code with manual input
router.post("/run", protect, compilerController.runCode);

// Submit code against database test cases
router.post("/submit", protect, compilerController.submitCode);

module.exports = router;