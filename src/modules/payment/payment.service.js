const axios = require("axios");

// ENV variables
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY;
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;

// Base URL (sandbox / production)
const INSTAMOJO_BASE_URL =
  process.env.INSTAMOJO_ENV === "PRODUCTION"
    ? "https://www.instamojo.com/api/1.1"
    : "https://test.instamojo.com/api/1.1";

/**
 * @desc Create Instamojo Payment Request
 */
exports.createInstamojoOrder = async (orderId, amount, user) => {
  try {
    const payload = {
      purpose: "Melo Battle Wallet Deposit",
      amount: amount.toString(),
      buyer_name: user?.name || "Melo Warrior",
      email: user?.email || "warrior@melobattle.com",
      phone: user?.phone || "9999999999",
      redirect_url: `${process.env.FRONTEND_URL}/payment-success?orderId=${orderId}`,
      send_email: false,
      send_sms: false,
      allow_repeated_payments: false
    };

    const response = await axios.post(
      `${INSTAMOJO_BASE_URL}/payment-requests/`,
      payload,
      {
        headers: {
          "X-Api-Key": INSTAMOJO_API_KEY,
          "X-Auth-Token": INSTAMOJO_AUTH_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error("Instamojo Order Error:", error?.response?.data || error.message);
    throw error;
  }
};

/**
 * @desc Verify Instamojo Payment
 * Instamojo does NOT use signature like Razorpay
 * It sends payment status via redirect or webhook
 */
exports.verifyInstamojoPayment = async (paymentId) => {
  try {
    const response = await axios.get(
      `${INSTAMOJO_BASE_URL}/payments/${paymentId}/`,
      {
        headers: {
          "X-Api-Key": INSTAMOJO_API_KEY,
          "X-Auth-Token": INSTAMOJO_AUTH_TOKEN
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error("Instamojo Verification Error:", error?.response?.data || error.message);
    return null;
  }
};