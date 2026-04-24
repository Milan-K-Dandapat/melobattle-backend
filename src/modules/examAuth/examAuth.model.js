const mongoose = require("mongoose");

const examAuthSchema = new mongoose.Schema({
  userId: String,        // exam ID (unique)
  password: String,      // hashed
  contestId: String,     // which exam
  isUsed: { type: Boolean, default: false } // optional (one-time login)
});

module.exports = mongoose.model("ExamAuth", examAuthSchema);