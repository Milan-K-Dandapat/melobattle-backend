const axios = require("axios");

// Configuration from your .env file
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "SANDBOX";

// Determine the correct API Base URL
const BASE_URL = CASHFREE_ENV === "PRODUCTION" 
  ? "https://api.cashfree.com/pg" 
  : "https://sandbox.cashfree.com/pg";

/**
 * Creates a unique Order for wallet top-ups or contest entries.
 * Amount is in Rupees (Cashfree handles decimals, no need for paise).
 * @param {number} amount - Amount in INR (e.g., 10.00)
 * @param {string} orderId - Unique ID for the transaction
 * @param {object} customerDetails - Required by Cashfree (id, phone, email)
 */
const createOrder = async (amount, orderId, customerDetails) => {
  const options = {
    method: 'POST',
    url: `${BASE_URL}/orders`,
    headers: {
      accept: 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'content-type': 'application/json'
    },
    data: {
      order_id: orderId || `order_${Date.now()}`,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: customerDetails?.id || "guest_user",
        customer_phone: customerDetails?.phone || "9999999999",
        customer_email: customerDetails?.email || "warrior@melobattle.com",
        customer_name: customerDetails?.name || "Melo Warrior"
      },
      order_meta: {
        // Fallback return URL if the popup is closed unexpectedly
        return_url: `https://battle.meloapp.in/wallet?order_id={order_id}`
      }
    }
  };

  try {
    const response = await axios.request(options);
    // Returns the full order object including 'payment_session_id'
    return response.data;
  } catch (error) {
    console.error("Cashfree Order Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { createOrder };