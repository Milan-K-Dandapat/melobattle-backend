const paymentService = require("./payment.service");
const User = require("../user/user.model");
const Transaction = require("../wallet/transaction.model");

/**
 * @desc  Create Order when user clicks "Add Cash"
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // 1. Generate a unique Order ID
    const orderId = `MELO_DEP_${Date.now()}_${userId.toString().slice(-6)}`;

    // 2. Create Instamojo Payment Request
    const user = await User.findById(userId);

    const orderData = await paymentService.createInstamojoOrder(orderId, amount, user);

    // 3. Save a PENDING transaction
    await Transaction.create({
      userId: userId,
      amount: amount,
      type: "DEPOSIT", 
      status: "PENDING",
      referenceId: orderId,
      instamojoPaymentRequestId: orderData.payment_request.id, // ✅ updated field
      description: "Wallet Deposit via Instamojo"
    });

    // 4. Return payment link to frontend
    res.json({
      success: true,
      paymentUrl: orderData.payment_request.longurl
    });

  } catch (error) {
    console.error("Order Creation Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to initialize payment gateway" });
  }
};


/**
 * @desc  Verify payment status
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { payment_id, payment_request_id, userId } = req.body;

    if (!payment_request_id) {
      return res.status(400).json({ success: false, message: "Payment Request ID required" });
    }

    // 1. Verify via Instamojo API
    const paymentData = await paymentService.verifyInstamojoPayment(payment_id);

    if (!paymentData || paymentData.payment.status !== "Credit") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    // 2. Find transaction
    const transaction = await Transaction.findOne({ instamojoPaymentRequestId: payment_request_id });

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (transaction.status === "SUCCESS") {
      return res.status(400).json({ success: false, message: "Payment already verified." });
    }

    // 3. Update user wallet
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const amountAdded = Number(transaction.amount);

    user.walletBalance = (user.walletBalance || 0) + amountAdded;
    user.depositBalance = (user.depositBalance || 0) + amountAdded;
    user.totalDeposited = (user.totalDeposited || 0) + amountAdded;

    await user.save();

    // 4. Update transaction
    transaction.status = "SUCCESS";
    transaction.balanceAfter = user.walletBalance;
    transaction.instamojoPaymentId = payment_id;
    await transaction.save();

    return res.json({
      success: true,
      message: "Payment verified successfully!",
      newBalance: user.walletBalance,
      depositBalance: user.depositBalance,
      amountAdded
    });

  } catch (error) {
    console.error("Verification Error:", error.message);
    res.status(500).json({ success: false, message: "Error verifying payment" });
  }
};