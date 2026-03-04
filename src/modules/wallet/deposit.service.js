const Razorpay = require("razorpay");
const crypto = require("crypto");
const Transaction = require("./transaction.model");
const User = require("../user/user.model");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ==============================
   CREATE ORDER
============================== */
exports.createOrder = async (userId, amount) => {
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`
  };

  const order = await razorpay.orders.create(options);

  await Transaction.create({
    userId,
    type: "DEPOSIT",
    amount,
    razorpayOrderId: order.id
  });

  return order;
};

/* ==============================
   VERIFY PAYMENT
============================== */
exports.verifyPayment = async (
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
) => {
  const body =
    razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature)
    throw new Error("Invalid payment signature");

  const transaction = await Transaction.findOne({
    razorpayOrderId: razorpay_order_id
  });

  if (!transaction)
    throw new Error("Transaction not found");

  if (transaction.status === "SUCCESS")
    return { message: "Already processed" };

  transaction.status = "SUCCESS";
  transaction.razorpayPaymentId = razorpay_payment_id;

  await transaction.save();

  // Credit wallet
  const user = await User.findById(transaction.userId);
  user.walletBalance += transaction.amount;
  await user.save();

  return { success: true };
};
