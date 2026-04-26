const mongoose = require("mongoose");
const Contest = require("./contest.model");
const User = require("../user/user.model");
const Transaction = require("../wallet/transaction.model"); // 🔥 Added for Reserved Ledger

/**
 * Fetch all contests for the Admin Matrix
 */
exports.getAllContestsForAdmin = async () => {
  try {
    return await Contest.find({})
      .sort({ createdAt: -1 })
      .lean(); 
  } catch (error) {
    throw new Error("Matrix Sync Failure: " + error.message);
  }
};

/**
 * Join a contest with transaction safety
 * FIXES: Added participant tracking and duplicate join prevention
 * 🔥 NEW: Added check to prevent joining if contest is already completed by user
 * 🔥 BALANCE FIX: Correctly deducts from Deposit/Winning balances
 * 🔥 LEDGER FIX: Creates a RESERVED transaction record for audit safety
 */
exports.joinContest = async (userId, contestId, io) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch contest and validate existence
    const contest = await Contest.findById(contestId).session(session);
    const now = new Date();

if (!contest.isInstantBattle) {
  if (contest.endTime && now > new Date(contest.endTime)) {
    throw new Error("Contest already ended");
  }
}
    if (!contest) throw new Error("Battle not found in the matrix");

    // 🔥 COMPLETION CHECK: Prevent joining if already played
    if (
      contest.completedParticipants &&
      contest.completedParticipants.some(
        id => id.toString() === userId.toString()
      )
    ) {
      throw new Error("Battle archived: You have already participated in this arena.");
    }

    if (
      contest.participants &&
      contest.participants.some(
        id => id.toString() === userId.toString()
      )
    ) {
      throw new Error("You are already deployed in this battle arena.");
    }

    // 5. Fetch user and check balance
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("Warrior not found");

    if (user.walletBalance < contest.entryFee) {
      throw new Error("Insufficient credits. Deposit required.");
    }

    /* =========================================
        🔥 SMART BALANCE DEDUCTION PROTOCOL
        Deducts from Deposit first, then Winnings.
    ========================================= */
    const entryFee = Number(contest.entryFee);
    const balanceBefore = user.walletBalance;
    
    if (user.depositBalance >= entryFee) {
        user.depositBalance -= entryFee;
    } else {
        const remaining = entryFee - (user.depositBalance || 0);
        user.depositBalance = 0;
        user.winningBalance = Math.max(0, (user.winningBalance || 0) - remaining);
    }

    // Sync total wallet balance
    user.walletBalance = (user.depositBalance || 0) + (user.winningBalance || 0);
    
    await user.save({ session });

    /* =========================================
        🔥 NEW: RESERVED TRANSACTION RECORD
        This ensures the entry fee is logged in 
        the system ledger as 'Pending Closure'.
    ========================================= */
    if (entryFee > 0) {
      await Transaction.create([{
        userId: userId,
        type: "ENTRY_FEE",
        amount: entryFee,
        status: "RESERVED", // 🔥 Locked until 15-min timer ends
        balanceAfter: user.walletBalance,
        referenceId: contest._id.toString(),
        description: `Arena Entry: ${contest.title}`
      }], { session });
    }

    // 7. Update contest stats
    contest.joinedCount += 1;
    // 🔥 RESET LOGIC FOR INSTANT BATTLES
if (contest.isInstantBattle && contest.joinedCount > contest.maxParticipants) {
  contest.joinedCount = contest.maxParticipants;
}

    /* =========================================
        🔥 DYNAMIC PRIZE CALCULATION FIX
        Calculates based on maxParticipants to ensure 
        weighted payouts work correctly at the end.
    ========================================= */
    if (!contest.isSponsored) {
      // FIX: totalCollection is the total potential pot (e.g., 35 * 2 = 70)
      contest.totalCollection = contest.maxParticipants * contest.entryFee;

      const houseCut =
        contest.totalCollection *
        (Number(contest.commissionPercentage || 20) / 100);

      // FIX: prizePool is total pot minus your cut (e.g., 70 - 14 = 56)
      contest.prizePool = contest.totalCollection - houseCut;
    } else {
      contest.prizePool = Number(contest.sponsorPrize) || 0;
    }

    // Push participant
    if (!contest.participants) contest.participants = [];
    contest.participants = contest.participants || [];

    if (
      !contest.participants.some(
        id => id.toString() === userId.toString()
      )
    ) {
      contest.participants.push(userId);

      const Participant = require("./participant.model");

await Participant.create([{
  contestId: contest._id,
  userId: userId,
  score: 0,
  accuracy: 0,
  completionTime: 0,
  joinedAt: new Date()
}], { session });
    }

    // 8. Auto-start protocol if full
if (!contest.isInstantBattle) {
  if (contest.joinedCount === contest.maxParticipants && contest.status === "UPCOMING") {
    contest.status = "LIVE";
  }
}

    await contest.save({ session });

    // 9. Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // 10. REAL-TIME ARENA BROADCAST
    if (io) {
      io.emit("CONTEST_UPDATED", {
        contestId: contest._id,
        joinedCount: contest.joinedCount,
        status: contest.status,
        prizePool: contest.prizePool // Sync updated pool to UI
      });
      
      io.emit("PLAYER_JOINED_UPDATE", {
  contestId: contest._id,
  joinedCount: contest.joinedCount,
  userId: user._id,
  username: user.username || user.name,
  walletBalance: user.walletBalance
});
    }

    return {
      success: true,
      message: "Arena entered successfully!",
      joinedCount: contest.joinedCount,
      data: {
        joinedCount: contest.joinedCount,
        prizePool: contest.prizePool,
        newBalance: user.walletBalance,
        depositBalance: user.depositBalance,
        winningBalance: user.winningBalance,
        status: contest.status,
        isJoined: true 
      }
    };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * 🔥 UPDATED: MANUAL ARENA QUESTION DISPATCHER
 * Optimized to prevent "Arena Sync Failed" by ensuring questions are ready and battle is LIVE.
 */
exports.getArenaQuestions = async (contestId, userId) => {
  try {
    /**
     * 🔥 MANUAL SYNC: Targeted Retrieval
     * We fetch the full document to check status before allowing question access.
     */
   const contest = await Contest.findById(contestId)
  .lean()
  .select("questions status duration title completedParticipants isInstantBattle startTime endTime");
    if (!contest) {
      throw new Error("Arena signal not found");
    }
// 🔐 HARD LOCK: BLOCK RE-ENTRY AFTER COMPLETION
if (
  contest.completedParticipants &&
  contest.completedParticipants.some(
    id => id.toString() === userId.toString()
  )
) {
  throw new Error("Access Denied: Battle already completed");
}
    // 🔥 CRITICAL: Prevent fetching questions if the battle hasn't technically started.
 const now = new Date();

if (!contest.isInstantBattle) {
  if (contest.startTime && now < new Date(contest.startTime)) {
    throw new Error("Battle not started yet");
  }

  if (contest.endTime && now > new Date(contest.endTime)) {
    throw new Error("Battle ended");
  }
}

    // Fallback logic: Ensure questions were actually uploaded for this battle
    if (!contest.questions || contest.questions.length === 0) {
      throw new Error("No manual questions found for this battle. Upload JSON in Admin Panel.");
    }

    // Return everything the frontend needs to render the BattleScreen
    return {
      questions: contest.questions,
      duration: contest.duration,
      title: contest.title
    };

  } catch (error) {
    console.error("🔥 Manual Question Retrieval Failed:", error.message);
    throw new Error("Manual Question Sync Terminated: " + error.message);
  }
};