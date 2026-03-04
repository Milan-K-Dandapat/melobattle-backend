const mongoose = require("mongoose");
const User = require("../user/user.model");
const Withdrawal = require("./withdrawal.model");

/* =========================================
    USER REQUEST WITHDRAWAL
========================================= */
exports.requestWithdrawal = async (userId, amount, upiId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const MIN_WITHDRAWAL = 20; 
    const MAX_WITHDRAWAL = 1000;

    // 1. Minimum & Maximum Validation
    if (amount < MIN_WITHDRAWAL) throw new Error(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`);
    if (amount > MAX_WITHDRAWAL) throw new Error(`Maximum withdrawal is ₹${MAX_WITHDRAWAL}`);

    // 2. Balance check
    if (user.walletBalance < amount) throw new Error("Insufficient balance in wallet");

    // 3. Play condition: Anti-money laundering check
    if (user.totalMatches < 1) {
      throw new Error("Play at least 1 contest before withdrawing");
    }

    // 4. 🔥 FIXED: ABSOLUTE DAILY LIMIT CHECK (00:00:00 to 23:59:59)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todayWithdrawals = await Withdrawal.find({
      userId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: "SUCCESS" 
    }).session(session);

    const totalToday = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    if (totalToday + Number(amount) > MAX_WITHDRAWAL) {
      throw new Error(`Daily withdrawal limit of ₹${MAX_WITHDRAWAL} exceeded. You already withdrew ₹${totalToday} today.`);
    }

    // 5. Fraud protection: Risk Scoring
    if (user.riskScore > 80) throw new Error("Account under review due to high risk score");

    // 6. Lock funds
    user.walletBalance -= Number(amount);
    user.lockedBalance = (user.lockedBalance || 0) + Number(amount); 
    await user.save({ session });

    // 7. 🔥 AUTOMATED SUCCESS PROTOCOL
    // Forcing SUCCESS status for all valid requests as per your "Automatic Approval" requirement
    const withdrawal = await Withdrawal.create(
      [
        {
          userId,
          amount: Number(amount),
          upiId,
          riskScoreSnapshot: user.riskScore || 0,
          status: "SUCCESS" 
        }
      ],
      { session }
    );

    // 8. Finalize immediate success logic
    user.lockedBalance -= Number(amount);
    user.totalWithdrawn = (user.totalWithdrawn || 0) + Number(amount);
    user.lastWithdrawalAt = new Date();
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    // 🔥 Return the actual document to ensure frontend gets the latest data
    return withdrawal[0];

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw error;
  }
};

/* =========================================
    ADMIN PROCESS WITHDRAWAL
========================================= */
exports.processWithdrawal = async (withdrawalId, approve) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
    if (!withdrawal) throw new Error("Withdrawal record not found");
    if (withdrawal.status !== "PENDING") throw new Error("Withdrawal has already been processed");

    const user = await User.findById(withdrawal.userId).session(session);
    if (!user) throw new Error("Associated user not found");

    if (!approve) {
      // REJECT: Refund to wallet
      withdrawal.status = "REJECTED";
      user.walletBalance += withdrawal.amount;
      user.lockedBalance -= withdrawal.amount;

      await user.save({ session });
      await withdrawal.save({ session });

      await session.commitTransaction();
      session.endSession();
      return { message: "Withdrawal rejected and funds refunded to wallet" };
    }

    // APPROVE: Finalize success
    withdrawal.status = "SUCCESS";
    withdrawal.processedAt = new Date();

    user.lockedBalance -= withdrawal.amount;
    user.lastWithdrawalAt = new Date();
    user.totalWithdrawn = (user.totalWithdrawn || 0) + withdrawal.amount;

    await user.save({ session });
    await withdrawal.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { message: "Withdrawal approved successfully" };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw error;
  }
};

/* =========================================
    FETCHING HELPERS
========================================= */
/**
 * 🔥 FIX: Correctly maps to the 'withdrawals' collection
 * Ensures the latest payouts appear first on the frontend history.
 */
exports.getUserWithdrawals = async (userId) => {
  return await Withdrawal.find({ userId }).sort({ createdAt: -1 });
};

exports.getPendingWithdrawals = async () => {
  return await Withdrawal.find({ status: "PENDING" })
    .populate("userId", "name email")
    .sort({ createdAt: 1 });
};