const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: true } // True for submit, False for run/test
}, { _id: false });

const codingQuestionSchema = new mongoose.Schema({
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contest",
    required: true
  },
  title: { type: String, required: true },
  problemStatement: { type: String, required: true },
  constraints: { type: String, default: "" },
  
  // Pre-filled code for the warriors when they enter the arena
  starterCode: {
    c: { type: String, default: "#include <stdio.h>\n\nint main() {\n    // Write C code here\n    return 0;\n}" },
    cpp: { type: String, default: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ code here\n    return 0;\n}" },
    java: { type: String, default: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write Java code here\n    }\n}" },
    python: { type: String, default: "# Write Python code here\n" }
  },
  
  testCases: [testCaseSchema]
}, { timestamps: true });

module.exports = mongoose.model("CodingQuestion", codingQuestionSchema);