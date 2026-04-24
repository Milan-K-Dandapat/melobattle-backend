const mongoose = require("mongoose");

const examAuthSchema = new mongoose.Schema({
  userId: String,        // exam ID (unique)
  password: String,      // hashed
  contestId: { type: String, default: null },// which exam
  isUsed: { type: Boolean, default: false } // optional (one-time login)
});

module.exports = mongoose.model("ExamAuth", examAuthSchema);