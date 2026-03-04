const paymentService = require("./payment.service");
const User = require("../user/user.model");
const Transaction = require("../wallet/transaction.model");

/**
 * @desc  Create Order when user clicks "Add Cash"
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, userId, userPhone, userName, userEmail } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // 1. Generate a unique Order ID
    const orderId = `MELO_DEP_${Date.now()}_${userId.toString().slice(-6)}`;

    // 2. Prepare customer payload
    const customerDetails = {
      customer_id: userId.toString(),
      customer_name: userName || "Melo Warrior",
      customer_email: userEmail || "warrior@melobattle.com",
      customer_phone: userPhone || "9999999999" 
    };

    // 3. Call Cashfree Service
    const orderData = await paymentService.createCashfreeOrder(orderId, amount, customerDetails);

    // 4. Save a PENDING transaction (Matches your DEPOSIT enum)
    await Transaction.create({
      userId: userId,
      amount: amount,
      type: "DEPOSIT", 
      status: "PENDING",
      referenceId: orderId, // Internal link
      cfOrderId: orderId,   // 🔥 UPDATED: Saving to your new cfOrderId field
      description: "Wallet Deposit via Cashfree"
    });

    // 5. Return session ID to React
    res.json({
      success: true,
      orderId: orderData.order_id,
      paymentSessionId: orderData.payment_session_id,
    });

  } catch (error) {
    console.error("Order Creation Error:", error?.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to initialize payment gateway" });
  }
};

/**
 * @desc  Verify payment status
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    if (!orderId) return res.status(400).json({ success: false, message: "Order ID required" });

    // 1. Ask Cashfree if the user actually paid
    const orderData = await paymentService.verifyCashfreePayment(orderId);

    // 2. Check the transaction in our database
    const transaction = await Transaction.findOne({ referenceId: orderId });
    if (!transaction) {
        return res.status(404).json({ success: false, message: "Transaction record not found" });
    }
    
    if (transaction.status === "SUCCESS") {
        return res.status(400).json({ success: false, message: "Payment already verified." });
    }

    // 3. If Cashfree says "PAID", update user and transaction
    if (orderData.order_status === "PAID") {
      
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const amountAdded = Number(orderData.order_amount);
      
      // 🔥 THE FIX: Update both Total Wallet Balance and specific Deposit Balance
      // This ensures your Withdrawal Page correctly reflects where the money came from.
      user.walletBalance = (user.walletBalance || 0) + amountAdded;
      user.depositBalance = (user.depositBalance || 0) + amountAdded;
      user.totalDeposited = (user.totalDeposited || 0) + amountAdded;
      
      await user.save();

      // Update Transaction status and Cashfree Payment Details
      transaction.status = "SUCCESS";
      transaction.balanceAfter = user.walletBalance; 
      transaction.cfPaymentId = orderData.cf_payment_id || ""; // 🔥 UPDATED: Saving the bank's payment ID
      await transaction.save();

      return res.json({ 
        success: true, 
        message: "Payment verified successfully!",
        newBalance: user.walletBalance,
        depositBalance: user.depositBalance,
        amountAdded
      });

    } else {
      transaction.status = "FAILED";
      transaction.failureReason = orderData.order_status; 
      await transaction.save();

      return res.json({ 
        success: false, 
        message: "Payment is pending or failed." 
      });
    }

  } catch (error) {
    console.error("Verification Error:", error?.response?.data || error.message);
    res.status(500).json({ success: false, message: "Error verifying payment" });
  }
};