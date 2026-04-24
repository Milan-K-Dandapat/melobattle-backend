const express = require("express");
const router = express.Router();

router.post("/log", (req, res) => {
  console.log("📸 Proctoring Log:", req.body);

  res.status(200).json({
    success: true,
    message: "Log saved"
  });
});

module.exports = router;