require("dotenv").config(); // Loads MONGO_URI from your .env file
const mongoose = require("mongoose");
const path = require("path");

// 🔥 PATH SYNC: Points to your actual Question model in the quiz module
const Question = require("../modules/quiz/question.model");

/**
 * ARENA SEEDING PROTOCOL
 * Optimized for: Bulk insertion of 1000+ questions.
 */
const seedQuestions = async () => {
  try {
    // 1. Establish Neural Link to MongoDB
    console.log("📡 Connecting to Database matrix...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database Connected Successfully.");

    // 2. Prepare Sample Questions (Expand this array to 1000+ for production)
    const questionsBank = [
      {
        text: "Which programming language is known as the backbone of the MERN stack?",
        options: ["Python", "Java", "JavaScript", "C++"],
        correctAnswer: 2,
        category: "General"
      },
      {
        text: "In React, which hook is used to manage side effects?",
        options: ["useState", "useEffect", "useContext", "useReducer"],
        correctAnswer: 1,
        category: "General"
      }
      // Add more questions here...
    ];

    console.log(`📦 Preparing to deploy ${questionsBank.length} questions to the arena...`);

    // 3. Purge existing questions (Optional: Clear bank before reload)
    // await Question.deleteMany({}); 

    // 4. Bulk Insert Protocol
    await Question.insertMany(questionsBank);

    console.log("🚀 SUCCESS: Question bank has been synchronized with the database.");
    process.exit(0);

  } catch (error) {
    console.error("🔥 SEEDING FAILED:", error.message);
    process.exit(1);
  }
};

seedQuestions();