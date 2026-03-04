const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const depositService = require("./deposit.service");

/* ==============================
   CREATE ORDER
============================== */
router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await depositService.createOrder(
      req.user._id,
      amount
    );

    res.json({ success: true, order });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/* ==============================
   VERIFY PAYMENT
============================== */
router.post("/verify", async (req, res) => {
  try {
    const result = await depositService.verifyPayment(
      req.body.razorpay_order_id,
      req.body.razorpay_payment_id,
      req.body.razorpay_signature
    );

    res.json(result);

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
