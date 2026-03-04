const axios = require("axios");
// 🔥 UPDATED: We now pull from the Contest model since questions live inside the contest
const Contest = require("../contest/contest.model"); // Adjust path if your contest model is located elsewhere

// Language ID mapping for Judge0 API (Standard CE Edition)
const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  java: 62,
  python: 71
};

// 🔥 Add these to your .env file later for production
const JUDGE0_URL = process.env.JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""; // You will need a free RapidAPI key for Judge0

/**
 * @desc    Run code against custom input (Run Button)
 */
exports.runCode = async (req, res) => {
  try {
    const { language, sourceCode, input } = req.body;

    if (!LANGUAGE_IDS[language]) {
      return res.status(400).json({ success: false, message: "Unsupported language" });
    }

    const options = {
      method: 'POST',
      url: `${JUDGE0_URL}/submissions`,
      params: { base64_encoded: 'false', wait: 'true' },
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      data: {
        language_id: LANGUAGE_IDS[language],
        source_code: sourceCode,
        stdin: input || ""
      }
    };

    const response = await axios.request(options);
    const { stdout, stderr, compile_output, status, time, memory } = response.data;

    // 3 means "Accepted" in Judge0
    if (status.id !== 3) { 
      return res.json({
        success: true,
        status: status.description,
        output: compile_output || stderr || stdout,
        isError: true
      });
    }

    res.json({
      success: true,
      status: "Accepted",
      output: stdout,
      time,
      memory,
      isError: false
    });

  } catch (error) {
    console.error("Compiler Run Error:", error.message);
    res.status(500).json({ success: false, message: "Compilation Failed", error: error.message });
  }
};

/**
 * @desc    Submit code against hidden test cases (Submit Button)
 */
exports.submitCode = async (req, res) => {
  try {
    const { questionId, language, sourceCode } = req.body;

    // 🔥 UPDATED LOGIC: Find the specific contest that contains this question ID
    const contest = await Contest.findOne({ "questions._id": questionId });
    
    if (!contest) {
      return res.status(404).json({ success: false, message: "Protocol question not found in any active arena" });
    }

    // 🔥 Extract the specific question object from the contest's questions array
    const question = contest.questions.id(questionId);

    let passedCount = 0;
    const totalCases = question.testCases.length;
    const results = [];

    for (let i = 0; i < totalCases; i++) {
      const testCase = question.testCases[i];
      
      const options = {
        method: 'POST',
        url: `${JUDGE0_URL}/submissions`,
        params: { base64_encoded: 'false', wait: 'true' },
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        data: {
          language_id: LANGUAGE_IDS[language],
          source_code: sourceCode,
          stdin: testCase.input,
          expected_output: testCase.expectedOutput
        }
      };

      const response = await axios.request(options);
      const data = response.data;

      const passed = data.status.id === 3; // 3 = Accepted
      if (passed) passedCount++;

      results.push({
        testCase: i + 1,
        passed,
        status: data.status.description,
        time: data.time,
        memory: data.memory,
        isHidden: testCase.isHidden
      });

      // LeetCode standard: Break early if one test case fails
      if (!passed) break;
    }

    const allPassed = passedCount === totalCases;

    res.json({
      success: true,
      allPassed,
      passedCount,
      totalCases,
      results
    });

  } catch (error) {
    console.error("Compiler Submit Error:", error.message);
    res.status(500).json({ success: false, message: "Submission Failed", error: error.message });
  }
};