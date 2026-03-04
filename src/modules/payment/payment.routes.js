const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("./payment.controller");

// 🔥 FIXED PATH: Changed "middlewares" to "middleware" to match your folder structure
const { protect } = require("../../middleware/auth.middleware"); 

// Endpoint to generate the checkout session
router.post("/create-order", protect, createOrder);

// Endpoint to verify payment and credit the wallet
router.post("/verify", protect, verifyPayment);

module.exports = router;