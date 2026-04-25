const mongoose = require("mongoose");

const examAuthSchema = new mongoose.Schema({
  userId: { type: String, required: true },      // exam ID (unique)
  password: { type: String, required: true },      // hashed
  contestId: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: "Contest",
  required: true 
},
  isUsed: { type: Boolean, default: false } // optional (one-time login)
});
examAuthSchema.index({ userId: 1, contestId: 1 }, { unique: true });
module.exports = mongoose.model("ExamAuth", examAuthSchema);