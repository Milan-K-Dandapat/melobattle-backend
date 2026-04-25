const mongoose = require("mongoose");

const examAuthSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  password: { type: String, required: true },

  plainPassword: {            // 🔥 ADD THIS BLOCK
    type: String,
    select: false
  },

  contestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Contest",
    required: true 
  },

  isUsed: { type: Boolean, default: false }
});
examAuthSchema.index({ userId: 1, contestId: 1 }, { unique: true });
module.exports = mongoose.model("ExamAuth", examAuthSchema);