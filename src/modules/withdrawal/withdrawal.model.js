const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    // 🔥 UPI ID is correctly defined and will be saved here
    upiId: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUCCESS", "FAILED"],
      default: "PENDING"
    },

    riskScoreSnapshot: {
      type: Number,
      default: 0
    },

    processedAt: Date,
    adminNote: String
  },
  {
    timestamps: true,
    // 🔥 Explicitly naming the collection to match your MongoDB Atlas
    collection: "withdrawals" 
  }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);