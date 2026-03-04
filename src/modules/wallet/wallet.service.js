const mongoose = require("mongoose");
const User = require("../user/user.model");
const Transaction = require("./transaction.model");

/* =========================================
    ADD BALANCE
========================================= */
/**
 * Handles Deposits and Contest Winnings
 * Optimized for: Mongoose Transaction Integrity
 */
exports.addBalance = async (
  userId,
  amount,
  type = "DEPOSIT",
  referenceId = ""
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);

    if (!user) throw new Error("User not found in the matrix");

    // 🔥 Update the core balances specifically based on type
    const numericAmount = Number(amount);
    
    if (type === "WIN") {
      user.winningBalance = (user.winningBalance || 0) + numericAmount;
    } else {
      user.depositBalance = (user.depositBalance || 0) + numericAmount;
    }
    
    // Always sync the total wallet balance
    user.walletBalance = (user.depositBalance || 0) + (user.winningBalance || 0);

    await user.save({ session });

    // 🔥 Generate Transaction Log
    await Transaction.create(
      [
        {
          userId,
          type, 
          amount: numericAmount,
          status: "SUCCESS",
          balanceAfter: user.walletBalance, // Total snapshot for audit
          referenceId,
          timestamp: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // 🔥 Return as plain object to ensure frontend sees fresh data
    return user.toObject();

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error(`🔥 Wallet Sync Error [Add]:`, error.message);
    throw error;
  }
};

/* =========================================
    DEDUCT BALANCE (ENTRY FEE & WITHDRAW)
========================================= */
/**
 * Handles Entry Fees and Withdrawals
 * 🔥 FIXED: Precision logic for Winning Balance updates
 */
exports.deductBalance = async (
  userId,
  amount,
  type = "ENTRY_FEE",
  options = {} // Supports { status: "SUCCESS", upiId: "user@bank", isWinning: true }
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("Warrior not found");

    const numericAmount = Number(amount);

    // 🔥 1. VALIDATION: Check the correct balance field
    if (options.isWinning || type === "WITHDRAW") {
      if ((user.winningBalance || 0) < numericAmount) {
        throw new Error("Insufficient winning balance for payout");
      }
    } else {
      if (user.walletBalance < numericAmount) {
        throw new Error("Insufficient total balance for arena entry");
      }
    }

    // 🔥 2. DEDUCTION LOGIC: Target specific winningBalance
    if (options.isWinning || type === "WITHDRAW") {
      user.winningBalance = (user.winningBalance || 0) - numericAmount;
      // Increment the lifetime tracker
      user.totalWithdrawn = (user.totalWithdrawn || 0) + numericAmount; 
    } else {
      // For entry fees, consume deposit balance first
      if ((user.depositBalance || 0) >= numericAmount) {
        user.depositBalance -= numericAmount;
      } else {
        const remainingToDeduct = numericAmount - (user.depositBalance || 0);
        user.depositBalance = 0;
        user.winningBalance = (user.winningBalance || 0) - remainingToDeduct;
      }
    }

    // 🔥 3. SYNC TOTAL WALLET BALANCE
    // Ensures total = deposit + winning at all times
    user.walletBalance = (user.depositBalance || 0) + (user.winningBalance || 0);

    await user.save({ session });

    // 🔥 4. GENERATE TRANSACTION RECORD
    const finalStatus = options.status || "SUCCESS";

    await Transaction.create(
      [
        {
          userId,
          type,
          amount: numericAmount,
          status: finalStatus,
          balanceAfter: user.walletBalance,
          referenceId: options.referenceId || "",
          upiId: options.upiId || "",
          timestamp: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // 🔥 FIXED: Return toObject() to strip Mongoose internal state 
    // This ensures res.json(user) in the controller sends the REAL updated numbers.
    return user.toObject();

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error(`🔥 Wallet Sync Error [Deduct]:`, error.message);
    throw error;
  }
};

/* =========================================
    USER TRANSACTION HISTORY
========================================= */
exports.getUserTransactions = async (
  userId,
  page = 1,
  limit = 10,
  type = null
) => {
  try {
    const query = { userId };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      transactions
    };
  } catch (error) {
    throw new Error("Transaction Retrieval Failed: " + error.message);
  }
};

/* =========================================
    ADMIN GET ALL TRANSACTIONS
========================================= */
exports.getAllTransactions = async (
  page = 1,
  limit = 20
) => {
  try {
    const transactions = await Transaction.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Transaction.countDocuments();

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      transactions
    };
  } catch (error) {
    throw new Error("Global Matrix Transaction Retrieval Failed: " + error.message);
  }
};