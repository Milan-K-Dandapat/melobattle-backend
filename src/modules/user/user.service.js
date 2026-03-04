const User = require("./user.model");

/**
 * Find a user by Firebase UID or Database ID
 */
exports.getUser = async (identifier, isFirebaseId = false) => {
  const query = isFirebaseId ? { firebaseUID: identifier } : { _id: identifier };
  return await User.findOne(query);
};

/**
 * Handle User Wallet Updates (Atomic)
 * This ensures balance updates are safe from race conditions.
 */
exports.updateBalance = async (userId, amount, type = "ADD") => {
  const increment = type === "ADD" ? amount : -amount;
  
  return await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: increment } },
    { new: true, runValidators: true }
  );
};

/**
 * Update User Stats after a Match
 */
exports.updateStats = async (userId, isWin) => {
  const update = {
    $inc: { totalMatches: 1 }
  };
  
  if (isWin) {
    update.$inc.totalWins = 1;
  }

  return await User.findByIdAndUpdate(userId, update, { new: true });
};

/**
 * Security: Track Device/IP for Fraud Prevention
 */
exports.trackSecurityInfo = async (userId, ip, deviceId) => {
  return await User.findByIdAndUpdate(userId, {
    ipAddress: ip,
    deviceId: deviceId
  });
};