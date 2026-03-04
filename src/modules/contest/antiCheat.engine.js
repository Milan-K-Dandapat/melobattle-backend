const User = require("../user/user.model");

exports.evaluatePlayer = async (
  userId,
  score,
  completionTime,
  accuracy
) => {
  const user = await User.findById(userId);
  if (!user) return;

  let risk = 0;

  if (completionTime < 5) risk += 20; // unrealistically fast
  if (accuracy > 95) risk += 10;
  if (score > 20 && completionTime < 10) risk += 20;

  user.riskScore += risk;

  if (user.riskScore > 100) {
    console.log(`⚠ Suspicious user detected: ${userId}`);
  }

  await user.save();
};
