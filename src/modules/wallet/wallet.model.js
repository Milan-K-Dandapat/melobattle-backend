const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    // Current spendable balance
    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"]
    },
    // Money currently tied up in active contests
    lockedBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDeposited: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);