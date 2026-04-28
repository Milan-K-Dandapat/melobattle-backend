const mongoose = require("mongoose");

/**
 * Sub-schema for Category Performance
 * Tracks periodic points specifically for one category (e.g., Cricket)
 */
const CategoryPointsSchema = new mongoose.Schema({
  daily: { type: Number, default: 0 },
  weekly: { type: Number, default: 0 },
  monthly: { type: Number, default: 0 },
  allTime: { type: Number, default: 0 }
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    /* ==========================
        AUTH SECTION
    ========================== */
    firebaseUID: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    /**
     * 🔥 THE FIX: UNIQUE USERNAME
     * Enforces global uniqueness for usernames
     */
    name: {
      type: String,
      required: true,
      unique: true, // No two users can share a name
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    avatar: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER"
    },
    isBlocked: {
      type: Boolean,
      default: false
    },

    /* ==========================
        WALLET SECTION
    ========================== */
    walletBalance: {
      type: Number,
      default: 0
    },
    // 🔥 ADDED: Separate Deposit Balance
    depositBalance: {
      type: Number,
      default: 0
    },
    // 🔥 ADDED: Separate Winning Balance
    winningBalance: {
      type: Number,
      default: 0
    },
    lockedBalance: {
      type: Number,
      default: 0
    },
    totalDeposited: {
      type: Number,
      default: 0
    },
    totalWithdrawn: {
      type: Number,
      default: 0
    },
    lastWithdrawalAt: {
      type: Date,
      default: null
    },

    /* ==========================
        🔥 UNIQUE PROMO SYSTEM
        Alphanumeric code for secure recruitment
    ========================== */
   promoCode: {
  type: String,
  unique: true,
  sparse: true, // 🔥 IMPORTANT FIX,
  uppercase: true,
  trim: true,
  index: true
},
    referredBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    },

    /* ==========================
        COMPETITION SECTION (GLOBAL)
    ========================== */
    totalMatches: {
      type: Number,
      default: 0
    },
    totalWins: {
      type: Number,
      default: 0
    },
    // Overall all-time rank (Elo System)
    rating: { 
      type: Number, 
      default: 1000 
    },

// 🔥 XP SYSTEM
points: {
  type: Number,
  default: 0
},
// 🔥 TIER SYSTEM
tier: {
  type: Number,
  default: 1
},

tierXP: {
  type: Number,
  default: 0
},

// 🏆 BADGES SYSTEM
badges: {
  type: [String],
  default: []
},

    // Global periodic points (Total across all categories)
    dailyPoints: { type: Number, default: 0 },
    weeklyPoints: { type: Number, default: 0 },
    monthlyPoints: { type: Number, default: 0 },

    /* ==========================
        LOCATION SECTION
    ========================== */
    location: {
      city: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
      country: { type: String, default: "India", trim: true }
    },

    /* ==========================
        🔥 NEW: PRIVACY PROTOCOL
        Allows users to hide certain data from public view
    ========================== */
    privacy: {
      stealth: { type: Boolean, default: false },
      showWalletToPublic: { type: Boolean, default: false },
      showLocation: { type: Boolean, default: true }
    },

    /* ==========================
        DYNAMIC CATEGORY ANALYTICS
    ========================== */
    /**
     * Map structure allows adding infinite categories (Maths, GK, Cricket, Football)
     * without changing the schema again.
     */
    categoryStats: {
      type: Map,
      of: CategoryPointsSchema,
      default: {}
    },

    /* ==========================
        FRAUD & SECURITY
    ========================= */
    riskScore: { type: Number, default: 0 },
    deviceId: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    isPremium: { type: Boolean, default: false } // Added for Elite features like Stealth
  },
  {
    timestamps: true
  }
);

/* ==========================
    INDEXES FOR PERFORMANCE
========================== */

// Global Ranking Indexes for Leaderboards
userSchema.index({ rating: -1 });
userSchema.index({ totalWins: -1 });
userSchema.index({ dailyPoints: -1 });
userSchema.index({ weeklyPoints: -1 });
userSchema.index({ monthlyPoints: -1 });

// Location Index for "Nearby" ranking efficiency
userSchema.index({ "location.city": 1 });
userSchema.index({ "location.state": 1 });

module.exports = mongoose.model("User", userSchema);