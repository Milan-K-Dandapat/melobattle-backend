const mongoose = require("mongoose");

/**
 * 🔥 LIVE CODING TEST CASE SCHEMA
 * Used specifically for the "LIVE CODING SOLVE" category
 */
const testCaseSchema = new mongoose.Schema({
  input: { type: String },
  expectedOutput: { type: String },
  isHidden: { type: Boolean, default: true } // True for submit, False for run/test
}, { _id: false });

/**
 * 🔥 HYBRID QUESTION SCHEMA
 * Adapts automatically based on the JSON you upload (MCQ vs Coding).
 * Required flags are removed so it doesn't crash when one type is uploaded instead of the other.
 */
const manualQuestionSchema = new mongoose.Schema({
  // --- MCQ SPECIFIC FIELDS ---
  text: { 
    type: String, 
    trim: true 
  },
  options: {
    type: [String],
    default: []
  },
  correctAnswer: {
    type: Number,
    min: 0
  },

  // --- LIVE CODING SPECIFIC FIELDS ---
  title: { 
    type: String, 
    trim: true 
  },
  problemStatement: { 
    type: String, 
    trim: true 
  },
  constraints: { 
    type: String, 
    default: "" 
  },
  starterCode: {
    c: { type: String, default: "#include <stdio.h>\n\nint main() {\n    // Write C code here\n    return 0;\n}" },
    cpp: { type: String, default: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ code here\n    return 0;\n}" },
    java: { type: String, default: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write Java code here\n    }\n}" },
    python: { type: String, default: "# Write Python code here\n" }
  },
  testCases: {
    type: [testCaseSchema],
    default: []
  }
}, { _id: true }); // ID helps in frontend keys

const prizeSlabSchema = new mongoose.Schema(
  {
    fromRank: {
      type: Number,
      required: true
    },
    toRank: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ["FIXED", "REFUND", "MULTIPLIER"],
      required: true
    },
    value: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const contestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true 
    },

    // 🔥 NEW: UNIQUE BATTLE CODE FOR SEARCHING
    battleCode: {
  type: String,
  unique: true,
  default: () => "BTL-" + Date.now().toString(36).toUpperCase()
},

    // 🔥 CATEGORY SYNC: ENUM REMOVED to allow Dynamic Database Categories!
    category: {
      type: String,
      required: true,
      default: "General",
      trim: true 
    },

    // 🔥 NEW: SUB-DOMAIN SUPPORT
    subCategory: {
      type: String,
      default: "General",
      trim: true
    },

    // 🔥 BANNER PROTOCOL: Stores Base64 string from laptop upload
    bannerImage: {
      type: String,
      default: ""
    },

    type: {
      type: String,
      enum: ["HEAD_TO_HEAD", "MULTIPLAYER"],
      required: true
    },

    entryFee: {
      type: Number,
      required: true,
      min: 0
    },

    maxParticipants: {
      type: Number,
      required: true,
      min: 2
    },

    // 🔥 DURATION ENFORCER: Admin-controlled time limit (in minutes)
    duration: {
      type: Number,
      default: 15,
      min: 1
    },

    joinedCount: {
      type: Number,
      default: 0
    },

    participants: [{
  type: [mongoose.Schema.Types.ObjectId],
  ref: "User",
  default: [],
  index: true
}],

    // 🔥 COMPLETION TRACKER: Stores IDs of users who finished the battle
    completedParticipants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: []
    }],

    // 🔥 QUESTION MATRIX: Stores hybrid JSON questions for this battle
    questions: {
      type: [manualQuestionSchema],
      default: []
    },

    // 🔥 HOUSE CUT MATRIX: Editable commission logic
    commissionPercentage: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    },

    totalCollection: {
      type: Number,
      default: 0
    },

    prizePool: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "UPCOMING",
        "LIVE",
        "PROCESSING",
        "COMPLETED",
        "ARCHIVED"
      ],
      default: "DRAFT"
    },

    startTime: {
      type: Date
    },

    // 🔥 DYNAMIC ENDTIME: Automatically calculated based on duration
    endTime: {
      type: Date
    },

    prizeSlabs: {
      type: [prizeSlabSchema],
      default: []
    },

    isProcessed: {
      type: Boolean,
      default: false
    },

    processedAt: {
      type: Date
    },

    totalPrizeDistributed: {
      type: Number,
      default: 0
    },

    winnerCount: {
      type: Number,
      default: 0
    },

    isSponsored: {
      type: Boolean,
      default: false
    },

    sponsorPrize: {
      type: Number,
      default: 0
    },

    winnerPercentage: {
      type: Number,
      default: 50 // Top 30% win by default
    },

  },
  {
    timestamps: true
  }
);

/**
 * 🔥 FIXED: ASYNC TEMPORAL SYNC
 * 1. Removed 'next' parameter to stop "next is not a function" error in Admin Panel.
 * 2. Automatically recalculates endTime = startTime + (duration * 60000ms).
 */
contestSchema.pre("save", async function () {
  if (this.startTime && this.duration) {
    const start = new Date(this.startTime).getTime();
    this.endTime = new Date(start + this.duration * 60 * 1000);
  }
});

/**
 * 🔥 DYNAMIC STATUS CALCULATOR
 * Determines correct contest state based on time
 */
contestSchema.methods.getDynamicStatus = function () {
  const now = new Date();

  if (this.status === "COMPLETED" || this.status === "ARCHIVED") {
    return this.status;
  }

  if (this.startTime && now < this.startTime) {
    return "UPCOMING";
  }

  if (this.startTime && this.endTime && now >= this.startTime && now <= this.endTime) {
    return "LIVE";
  }

  if (this.endTime && now > this.endTime && !this.isProcessed) {
  return "PROCESSING";
}

if (this.isProcessed) {
  return "COMPLETED";
}

  return this.status;
};

// 🔎 Optimized Indexes for high-speed performance
contestSchema.index({ status: 1 });
contestSchema.index({ category: 1 }); 
contestSchema.index({ subCategory: 1 }); // Added index for the new subCategory
contestSchema.index({ startTime: 1 });
contestSchema.index({ participants: 1 }); 
contestSchema.index({ completedParticipants: 1 }); // Index added for fast lookups

module.exports = mongoose.model("Contest", contestSchema);