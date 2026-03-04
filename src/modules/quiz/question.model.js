const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // Index 0-3
  category: { 
    type: String, 
    required: true, 
    enum: ["Maths", "Science", "GK", "Cricket", "Football", "General"],
    index: true 
  }
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);