const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    score: {
      type: Number,
      default: 0
    },

    accuracy: {
      type: Number,
      default: 0
    },

    completionTime: {
      type: Number,
      default: 0
    },

    rank: {
      type: Number
    },

    prizeWon: {
      type: Number,
      default: 0
    },

    /* 🔥 NEW ANALYTICS FIELDS */

    joinedAt: {
      type: Date,
      default: Date.now
    },

    playedAt: {
      type: Date
    },

    deviceInfo: {
      type: String,
      default: ""
    },

    ipAddress: {
      type: String,
      default: ""
    },
    code: {
  type: String,
  default: ""
},
language: {
  type: String,
  default: ""
},
  },
  {
    timestamps: true
  },
);

/* prevents duplicate participant per contest */
participantSchema.index({ contestId: 1, userId: 1 }, { unique: true });

/* 🔥 leaderboard performance index */
participantSchema.index({
  contestId: 1,
  score: -1,
  accuracy: -1,
  completionTime: 1
});

module.exports = mongoose.model("Participant", participantSchema);