const Question = require("../quiz/question.model");
const redis = require("../../config/redis");

exports.startMatch = async (contestId) => {
  // 1. Fetch random questions for the contest category
  const questions = await Question.find({ /* category filter */ }).limit(10);
  
  // 2. Cache questions in Redis for ultra-fast access during the live quiz
  await redis.set(`match:${contestId}:questions`, JSON.stringify(questions), "EX", 3600);
  
  return questions;
};