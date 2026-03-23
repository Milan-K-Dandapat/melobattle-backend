const axios = require("axios");

// ENV variables
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY;
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;

// Base URL (test or live)
const BASE_URL = process.env.INSTAMOJO_ENV === "PRODUCTION"
  ? "https://www.instamojo.com/api/1.1/"
  : "https://test.instamojo.com/api/1.1/";

// Debug logs
console.log("Instamojo API Key:", INSTAMOJO_API_KEY ? INSTAMOJO_API_KEY.substring(0, 6) + "****" : "Missing");
console.log("Instamojo Auth Token Loaded:", INSTAMOJO_AUTH_TOKEN ? "Yes" : "No");

/**
 * Create Instamojo Payment Request
 */
const createOrder = async (amount, orderId, customerDetails) => {

  if (!amount || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  if (!INSTAMOJO_API_KEY || !INSTAMOJO_AUTH_TOKEN) {
    throw new Error("Instamojo credentials missing");
  }

  try {
    const payload = {
      purpose: "Melo Battle Wallet Deposit",
      amount: amount.toString(),
      buyer_name: customerDetails?.name || "Melo Warrior",
      email: customerDetails?.email || "warrior@melobattle.com",
      phone: customerDetails?.phone || "9999999999",
      redirect_url: "https://battle.meloapp.in/payment-success",
      webhook: "https://your-backend-url/api/v1/payment/webhook",
      allow_repeated_payments: false
    };

    console.log("Creating Instamojo Order:", payload);

    const response = await axios.post(
      `${BASE_URL}payment-requests/`,
      payload,
      {
        headers: {
          "X-Api-Key": INSTAMOJO_API_KEY,
          "X-Auth-Token": INSTAMOJO_AUTH_TOKEN
        }
      }
    );

    const data = response.data;

    console.log("Instamojo Order Created:", data.payment_request.id);

    return {
      id: data.payment_request.id,
      payment_url: data.payment_request.longurl
    };

  } catch (error) {
    console.error("Instamojo Order Error:", error.response?.data || error.message);
    throw error;
  }
};


/**
 * Verify Instamojo Payment
 */
const verifyOrder = async (paymentRequestId) => {

  try {
    const response = await axios.get(
      `${BASE_URL}payment-requests/${paymentRequestId}/`,
      {
        headers: {
          "X-Api-Key": INSTAMOJO_API_KEY,
          "X-Auth-Token": INSTAMOJO_AUTH_TOKEN
        }
      }
    );

    const data = response.data.payment_request;

    if (data.status === "Completed") {
      console.log("Payment Verified ✅");
      return {
        status: "success",
        amount: data.amount,
        paymentId: data.payments[0]?.payment_id
      };
    } else {
      console.log("Payment Not Completed ❌");
      return { status: "failed" };
    }

  } catch (error) {
    console.error("Verification Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { createOrder, verifyOrder };