const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  startTime: { type: Date, required: true },
  isCompleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Match", matchSchema);