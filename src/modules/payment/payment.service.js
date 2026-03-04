const axios = require("axios");

// Automatically switch URLs based on your .env
const CF_API_URL = process.env.CASHFREE_ENV === "PRODUCTION" 
  ? "https://api.cashfree.com/pg" 
  : "https://sandbox.cashfree.com/pg";

/**
 * @desc Initialize a Cashfree Order
 */
exports.createCashfreeOrder = async (orderId, amount, customerDetails) => {
  const payload = {
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: customerDetails,
    order_meta: {
      // This return URL is just a fallback. We handle the real verification via React popup.
      return_url: `http://localhost:5173/wallet?order_id=${orderId}` 
    }
  };

  const response = await axios.post(`${CF_API_URL}/orders`, payload, {
    headers: {
      "x-client-id": process.env.CASHFREE_APP_ID,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY,
      "x-api-version": "2023-08-01",
      "Content-Type": "application/json"
    }
  });
  
  return response.data;
};

/**
 * @desc Fetch the absolute truth about a payment from Cashfree's servers
 */
exports.verifyCashfreePayment = async (orderId) => {
  const response = await axios.get(`${CF_API_URL}/orders/${orderId}`, {
    headers: {
      "x-client-id": process.env.CASHFREE_APP_ID,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY,
      "x-api-version": "2023-08-01"
    }
  });
  
  return response.data;
};