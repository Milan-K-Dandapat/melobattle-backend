const Contest = require("./contest.model");
const User = require("../user/user.model");
const contestService = require("./contest.service");
const leaderboardService = require("./leaderboard.service");
const Participant = require("./participant.model");
const Transaction = require("../wallet/transaction.model"); // 🔥 Added for Ledger Finalization

/* =========================================
    1. CONTEST CREATION & ADMIN TOOLS
========================================= */

/**
 * @desc    Create Contest (Optimized for Laptop Uploads, Prize Logic & Manual Questions)
 * @route   POST /api/contest/create
 */
exports.createContest = async (req, res) => {
  try {
    const {
      title,
      entryFee,
      maxParticipants,
      startTime,
      duration,
      type,
      category,
      commissionPercentage,
      bannerImage,
      questions,
      isSponsored,
      sponsorPrize,
      winnerPercentage
    } = req.body;

    if (!title || !type || entryFee === undefined || !maxParticipants || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, category, type, entryFee, or maxParticipants"
      });
    }

    // 🔥 Sponsored Safety Check
    if (isSponsored && (!sponsorPrize || sponsorPrize <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Sponsored contest must have sponsorPrize greater than 0"
      });
    }

    const cleanCategory = category.trim();

    /* =========================================
        🔥 ADVANCED PRIZE CALCULATION ENGINE
        FIX: Calculated based on total expected contestants (maxParticipants)
    ========================================= */

    let calculatedPrizePool = 0;
    let totalCollection = 0;

    if (isSponsored) {
      // FREE contest
      calculatedPrizePool = Number(sponsorPrize) || 0;
      totalCollection = 0;
    } else {
      const comm = commissionPercentage ?? 20;

      // 🔥 FIX: total amount = entryFee * maxParticipants (e.g. 35 * 2 = 70)
      totalCollection = Number(entryFee) * Number(maxParticipants);
      const houseCut = totalCollection * (comm / 100);

      // 🔥 FIX: prize pool = totalCollection - 20% cut (e.g. 70 - 14 = 56)
      calculatedPrizePool = totalCollection - houseCut;

      // 🔥 Allow manual override if admin sends prizePool
      if (req.body.prizePool && Number(req.body.prizePool) > 0) {
        calculatedPrizePool = Number(req.body.prizePool);
      }
    }

 const start = new Date(startTime);
const endTime = new Date(start.getTime() + (Number(duration) || 15) * 60000);

const contest = await Contest.create({
  ...req.body,
  category: cleanCategory,
  duration: Number(duration) || 15,
  startTime: start,
  endTime: endTime,
  questions: questions || [],
  totalCollection,
  prizePool: calculatedPrizePool,
  winnerPercentage: winnerPercentage ?? 60,
  status: req.body.status || "UPCOMING",
  joinedCount: 0,
  participants: [],
  completedParticipants: []
});

    const io = req.app.get("io");
    if (io) {
      io.emit("NEW_CONTEST_DEPLOYED", contest);
    }

    res.status(201).json({ success: true, data: contest });

  } catch (error) {
    console.error("🔥 Create Error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 🔥 FIXED: Update Contest Matrix
 */
exports.updateContest = async (req, res) => {
  try {
    const { id } = req.params;

    const contest = await Contest.findById(id);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Matrix target not found"
      });
    }

    Object.assign(contest, req.body);

    /* =========================================
        🔥 RE-CALCULATE PRIZE ON UPDATE
    ========================================= */

    if (contest.isSponsored) {
      contest.prizePool = Number(contest.sponsorPrize) || 0;
      contest.totalCollection = 0;
      contest.entryFee = 0; // ensure FREE contest
    } else {
      const totalCollection =
        Number(contest.entryFee) * Number(contest.maxParticipants);

      const houseCut =
        totalCollection * (Number(contest.commissionPercentage) / 100);

      contest.totalCollection = totalCollection;
      contest.prizePool = totalCollection - houseCut;
    }

    // Safe winner %
    contest.winnerPercentage = contest.winnerPercentage ?? 60;

    await contest.save();

    res.json({
      success: true,
      message: "Contest Matrix Reconfigured",
      data: contest
    });

  } catch (error) {
    console.error("🔥 Update Sequence Failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Update Terminated: " + error.message
    });
  }
};

/**
 * @desc    Delete Contest from Arena
 */
exports.deleteContest = async (req, res) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);
    if (!contest) return res.status(404).json({ success: false, message: "Target already purged" });
    
    const io = req.app.get("io");
    if (io) io.emit("CONTEST_TERMINATED", req.params.id);

    res.json({ success: true, message: "Contest terminated from Arena." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
    2. CONTEST FETCHING (Dream11 Style Logic)
========================================= */

/**
 * @desc    Fetch available battles with Persistent Joined & Completed Status
 */
exports.getAllContests = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === "ADMIN";
    const now = new Date();

const query = isAdmin
  ? {}
  : {
      status: { $nin: ["ARCHIVED"] }
    };

    const contests = await Contest.find(query)
      .sort({ startTime: 1 })
      .lean();

   const formattedContests = contests.map((contest) => {

  const dynamicStatus = (() => {
    const now = new Date();

    if (contest.status === "COMPLETED" || contest.status === "ARCHIVED") {
      return contest.status;
    }

    if (contest.startTime && now < new Date(contest.startTime)) {
      return "UPCOMING";
    }

    if (
      contest.startTime &&
      contest.endTime &&
      now >= new Date(contest.startTime) &&
      now <= new Date(contest.endTime)
    ) {
      return "LIVE";
    }

    if (contest.endTime && now > new Date(contest.endTime)) {
      return "PROCESSING";
    }

    return contest.status;
  })();

  let computedPrizePool = 0;

  if (contest.isSponsored) {
    computedPrizePool = Number(contest.sponsorPrize) || 0;
  } else {
    const totalCollection =
      (contest.maxParticipants || 0) * (contest.entryFee || 0);

    const houseCut =
      totalCollection *
      (Number(contest.commissionPercentage || 20) / 100);

    computedPrizePool = totalCollection - houseCut;
  }

  return {
    ...contest,
    status: dynamicStatus, // 🔥 important fix
    prizePool: computedPrizePool,

    isJoined: Array.isArray(contest.participants)
      ? contest.participants.some(
          (id) => id.toString() === req.user._id.toString()
        )
      : false,

    isCompletedByUser: Array.isArray(contest.completedParticipants)
      ? contest.completedParticipants.some(
          (id) => id.toString() === req.user._id.toString()
        )
      : false
  };
});

    res.json({
      success: true,
      count: formattedContests.length,
      data: formattedContests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get detailed contest info with Status Checks
 */
exports.getContestById = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      // 🔥 FIX: Added 'rating', 'points', 'dailyPoints' to populate to ensure XP is sent
      .populate({
  path: "participants",
  select: "_id username name avatar rating points totalWins"
})
      .lean();

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    // 🔥 SAME DYNAMIC PRIZE LOGIC AS DASHBOARD
    let computedPrizePool = 0;

    if (contest.isSponsored) {
      computedPrizePool = Number(contest.sponsorPrize) || 0;
    } else {
      const totalCollection =
        (contest.maxParticipants || 0) * (contest.entryFee || 0);

      const houseCut =
        totalCollection *
        (Number(contest.commissionPercentage || 20) / 100);

      computedPrizePool = totalCollection - houseCut;
    }

    const userId = req.user._id.toString();
    // 🔥 Fetch live battle roster
const roster = await Participant.find({ contestId: contest._id })
  .populate({
  path: "userId",
  select: "username name avatar rating points",
  model: "User"
})
  .sort({ rank: 1 })
  .lean();

const formattedRoster = roster.map((p, index) => ({
  rank: p.rank || index + 1,
  userId: p.userId?._id,
  username: p.userId?.username || p.userId?.name || "Warrior",
  avatar: p.userId?.avatar || "",
  xp: p.userId?.rating || 0,
  score: p.score || 0
}));

    const isJoined = Array.isArray(contest.participants)
  ? contest.participants.some(p =>
      (p._id?.toString() || p.toString()) === userId
    )
  : false;

    const isCompletedByUser = Array.isArray(contest.completedParticipants)
      ? contest.completedParticipants.some(id => id.toString() === userId)
      : false;

    res.json({
      success: true,
      data: {
  ...contest,
  prizePool: computedPrizePool,
  roster: formattedRoster,
  isJoined,
  isCompletedByUser
}
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUpcomingContests = async (req, res) => {
  try {
    const contests = await Contest.find({ status: "UPCOMING" })
      .sort({ startTime: 1 })
      .limit(10)
      .lean();
    
    const data = contests.map(c => ({
      ...c,
      isJoined: c.participants ? c.participants.some(id => id.toString() === req.user._id.toString()) : false,
      isCompletedByUser: c.completedParticipants ? c.completedParticipants.some(id => id.toString() === req.user._id.toString()) : false
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyContests = async (req, res) => {
  try {
    const contests = await Contest.find({
      participants: req.user._id
    }).sort({ startTime: -1 }).lean();

    const now = new Date();

    const updatedContests = contests.map(c => {

      let status = c.status;

      if (now < new Date(c.startTime)) {
  status = "UPCOMING";
} 
else if (now >= new Date(c.startTime) && now <= new Date(c.endTime)) {
  status = "LIVE";
}
else if (now > new Date(c.endTime) && status !== "COMPLETED") {
  status = "PROCESSING";
}

      return {
        ...c,
        status,
        isJoined: true,
        isCompletedByUser: c.completedParticipants
          ? c.completedParticipants.some(id => id.toString() === req.user._id.toString())
          : false
      };
    });

    res.json({
      success: true,
      data: updatedContests
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export specific contest results for CSV
 * @route   GET /api/v1/contest/:id/export
 */
exports.exportContestCSV = async (req, res) => {
  try {
    const contestId = req.params.id;

    const participants = await Participant.find({ contestId })
      .populate("userId", "name username email")
      .sort({ rank: 1 })
      .lean();

    if (!participants || participants.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No warriors found in this arena"
      });
    }

    let csv =
"Rank,Username,Email,Score,Accuracy,CompletionTime,PrizeWon,JoinedAt,PlayedAt,Device,IP\n";

    participants.forEach((p, index) => {
      const username = p.userId?.username || p.userId?.name || "Warrior";
      const email = p.userId?.email || "N/A";

      csv += `${p.rank || index + 1},${username},${email},${p.score || 0},${p.accuracy || 0},${p.completionTime || 0},${p.prizeWon || 0},${p.joinedAt || ""},${p.playedAt || ""},${p.deviceInfo || ""},${p.ipAddress || ""}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contest_${contestId}.csv`
    );

    res.status(200).send(csv);

  } catch (error) {
    console.error("CSV Export Error:", error);
    res.status(500).json({
      success: false,
      message: "CSV export failed"
    });
  }
};
/**
 * 🔥 UPDATED: SECURITY-ENFORCED QUESTION DISPATCHER
 * @route   GET /api/contest/battle/:id
 */
exports.getBattleQuestions = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ success: false, message: "Arena signal not found" });

    const userId = req.user._id.toString();

    // 🚨 BLOCK 1: Check Authorization
    const isJoined = contest.participants.some(id => id.toString() === userId);
    if (!isJoined) {
      return res.status(403).json({ success: false, message: "Unauthorized participant" });
    }

    // 🚨 BLOCK 2: Check for existing play-through (The core fix)
    const alreadyPlayed = contest.completedParticipants && contest.completedParticipants.some(id => id.toString() === userId);
    if (alreadyPlayed) {
      return res.status(403).json({ 
        success: false, 
        message: "Battle archived: Access denied for multiple attempts",
        isCompletedByUser: true 
      });
    }

    const quizData = await contestService.getArenaQuestions(contest._id);
    
    res.json({ 
      success: true, 
      data: {
          ...quizData,
          isCompletedByUser: false // Explicitly tell frontend they can play
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Combat Sync Terminated: " + error.message });
  }
};

/* =========================================
    3. ADVANCED GLOBAL LEADERBOARD LOGIC
========================================= */

/**
 * @desc    Get Global/Category Leaderboard with Timeframe Filters
 * @route   GET /api/contest/leaderboard/:category/:timeframe
 */
exports.getAdvancedLeaderboard = async (req, res) => {
  try {
    const { category, timeframe } = req.params;
    const isGlobal = category.toLowerCase() === 'all';
    
    const timeframeMap = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', global: 'allTime' };
    const targetTime = timeframeMap[timeframe] || 'daily';
    
    let query = {};
    let sortField = "";

    if (isGlobal) {
        // Global ranking should sort by rating (ELO)
        sortField = (timeframe === 'global' || timeframe === 'nearby') ? 'rating' : `${timeframe}Points`;
    } else {
        // 🔥 FIX 1: Exact mapping to Admin Panel fields
        // Ensure category name is encoded/decoded correctly if it has spaces or "&"
        sortField = `categoryStats.${category}.${targetTime}`;
        
        // 🔥 FIX 2: Strict Filtering
        // Only show users who have actually scored points (> 0) in this specific category
        query[sortField] = { $gt: 0 }; 
    }

    if (timeframe === 'nearby' && req.user.location?.city) {
        query["location.city"] = req.user.location.city;
    }

    const players = await User.find(query)
      .select(`name avatar rating location categoryStats.${category} totalWins dailyPoints weeklyPoints monthlyPoints`)
      .sort({ [sortField]: -1 }) // 🔥 FIX 3: Dynamic Descending Sort (Highest points first)
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: players.map((p, i) => ({
        _id: p._id,
        name: p.name,
        avatar: p.avatar,
        rank: i + 1, // Correct rank based on sorted order
        city: p.location?.city || "Warrior",
        // Return the specific score for this category/timeframe
        score: isGlobal ? (p[sortField] || 0) : (p.categoryStats?.[category]?.[targetTime] || 0),
        rating: p.rating || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Specific Contest Standings (Rankings for one battle)
 * @route   GET /api/contest/:contestId/leaderboard
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const data = await leaderboardService.getTopPlayers(req.params.contestId);
    
    const formattedData = Array.isArray(data) ? data.map(player => ({
        ...player,
        isCurrentUser: player.userId?.toString() === req.user._id.toString() || player._id?.toString() === req.user._id.toString()
    })) : [];

    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
    4. COMBAT ACTIONS (Join, Start, Submit)
========================================= */

exports.joinContest = async (req, res) => {
  try {
    const io = req.app.get("io");
    const result = await contestService.joinContest(
      req.user._id, 
      req.params.contestId || req.body.contestId,
      io
    );

    if (io && result) {
        io.emit("PLAYER_JOINED_UPDATE", { 
            contestId: req.params.contestId || req.body.contestId, 
            joinedCount: result.joinedCount 
        });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message.includes("already joined") || error.message.includes("already deployed")) {
        return res.json({ success: true, message: "Warrior already authorized" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 🔥 START BATTLE PROTOCOL
 */
exports.startBattle = async (req, res) => {
  try {
    const { contestId } = req.body;
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ success: false, message: "Arena not found" });
    }

  const now = new Date();

if (now < new Date(contest.startTime)) {
  return res.status(400).json({
    success: false,
    message: "Battle has not started yet"
  });
}

if (now > new Date(contest.endTime)) {
  return res.status(400).json({
    success: false,
    message: "Contest already ended"
  });
}

const io = req.app.get("io");
if (io) {
  io.emit("BATTLE_STARTED", { contestId: contest._id });
}

    res.json({ 
      success: true, 
      message: "Combat Initiated", 
      status: contest.getDynamicStatus()
    });
  } catch (error) {
    console.error("🔥 Battle Start Failed:", error.message);
    res.status(500).json({ success: false, message: "System failure during combat start" });
  }
};

/**
 * 🔥 NEW: SUBMIT BATTLE RESULTS & LOCK CONTEST
 * @desc    Marks user as completed, saves score, and prevents re-entry
 * @route   POST /api/contest/submit
 */
exports.submitBattle = async (req, res) => {
  try {
    const { contestId, score, accuracy, timeTaken } = req.body;
    const userId = req.user._id;

    const contest = await Contest.findById(contestId);
    if (!contest)
      return res.status(404).json({ success: false, message: "Arena signal lost" });

    const alreadySubmitted = contest.completedParticipants?.some(
      id => id.toString() === userId.toString()
    );

    if (alreadySubmitted) {
      return res.status(400).json({
        success: false,
        message: "Combat results already archived"
      });
    }

    // 1. FIRST SAVE PARTICIPANT SCORE
  await Participant.findOneAndUpdate(
  { contestId, userId },
  {
    score,
    accuracy,
    completionTime: timeTaken,
    playedAt: new Date(),
    deviceInfo: req.headers["user-agent"] || "",
    ipAddress: req.ip
  },
  {
    new: true,
    upsert: true
  }
);

// 🔥 Recalculate leaderboard immediately
await leaderboardService.getTopPlayers(contestId);
    // 2. THEN LOCK CONTEST FOR THIS USER
    contest.completedParticipants.push(userId);
    
    // 🔥 REMOVED INSTANT PAYOUT: The winner is now decided only via Cron (15-min timer)
    // or through the Admin Force Close protocol below.
    
    await contest.save();

    res.json({
      success: true,
      message: "Combat results synchronized and arena locked",
      isContestClosed: false // Controlled by time/admin
    });

  } catch (error) {
    console.error("🔥 Submission Critical Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Deployment log failed: " + error.message
    });
  }
};

/**
 * 🔥 NEW: ADMIN FORCE CLOSE PROTOCOL
 * @desc    Manually triggers payout and status closure
 * @route   POST /api/contest/:id/force-close
 */
exports.forceCloseContest = async (req, res) => {
  try {

    // 🔒 ADMIN SECURITY CHECK (ADD THIS HERE)
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized action"
      });
    }

    const contest = await Contest.findById(req.params.id);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Arena not found"
      });
    }

    if (contest.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Arena already closed and processed"
      });
    }

    // 1️⃣ Finalize status
    contest.status = "COMPLETED";
    await contest.save();

    // 2️⃣ Finalize Ledger: RESERVED -> SUCCESS
    await Transaction.updateMany(
      { referenceId: contest._id.toString(), type: "ENTRY_FEE", status: "RESERVED" },
      { $set: { status: "SUCCESS" } }
    );

    // 3️⃣ Official Payout
    await closeContestAndDistributePrizes(contest, req.app.get("io"));

    res.json({
      success: true,
      message: "Arena forced to archive. Payouts dispatched."
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 🔥 INTERNAL HELPER: DECIDE WINNERS & DISTRIBUTE PRIZES
 * FIXED: Implements weighted payout based on rank.
 */
async function closeContestAndDistributePrizes(contest, io) {
  try {
    // 1. Get all participants sorted by performance
    const standings = await Participant.find({ contestId: contest._id })
      .sort({ rank: 1, score: -1, accuracy: -1, completionTime: 1 })
      .lean();

    if (!standings || standings.length === 0) return;

    const totalPool = Number(contest.prizePool);
    
    /* =========================================
        🔥 WEIGHTED PAYOUT ENGINE
        If 2 players: 1st gets 70%, 2nd gets 30%
        If more: follows decreasing ratio
    ========================================= */
    const totalPlayers = standings.length;
    
    if (totalPlayers === 2) {
        // Rank 1: 70% (Profit), Rank 2: 30% (Partial loss)
        const percentages = [0.7, 0.3];
        
        for (let i = 0; i < standings.length; i++) {
            const prize = Math.floor(totalPool * percentages[i]);
            
            await User.findByIdAndUpdate(standings[i].userId, {
                $inc: { 
                    winningBalance: prize, 
                    walletBalance: prize,
                    totalWins: i === 0 ? 1 : 0 
                }
            });

            // Create Winner Transaction
            if (prize > 0) {
              await Transaction.create({
                userId: standings[i].userId,
                type: "WIN",
                amount: prize,
                status: "SUCCESS",
                referenceId: contest._id.toString(),
                description: `Arena Reward: ${contest.title} (Rank #${i+1})`
              });
            }

            standings[i].rank = i + 1;
            standings[i].prizeWon = prize;
            await standings[i].save();
        }
    } else {
        // For N players, top 60% win something by default
        const winnerCount = Math.ceil(totalPlayers * (contest.winnerPercentage / 100));
        
        // Simple linear weight distribution
        let totalWeight = 0;
        for (let i = winnerCount; i >= 1; i--) totalWeight += i;

        for (let i = 0; i < totalPlayers; i++) {
            let prize = 0;
            if (i < winnerCount) {
                const weight = winnerCount - i;
                prize = Math.floor((weight / totalWeight) * totalPool);
            }

            if (prize > 0) {
                await User.findByIdAndUpdate(standings[i].userId, {
                    $inc: { 
                        winningBalance: prize, 
                        walletBalance: prize,
                        totalWins: i === 0 ? 1 : 0 
                    }
                });

                // Create Winner Transaction
                await Transaction.create({
                  userId: standings[i].userId,
                  type: "WIN",
                  amount: prize,
                  status: "SUCCESS",
                  referenceId: contest._id.toString(),
                  description: `Arena Reward: ${contest.title} (Rank #${i+1})`
                });
            }

            standings[i].rank = i + 1;
            standings[i].prizeWon = prize;
            await standings[i].save();
        }
    }

    if (io) {
      io.emit("CONTEST_FINALIZED", { 
        contestId: contest._id, 
        message: "Battle complete. Prizes distributed!"
      });
    }

    console.log(`🏆 Contest ${contest.title} Finalized. Prizes Distributed.`);

  } catch (err) {
    console.error("🏆 Prize Distribution System Failure:", err.message);
  }
}

// 🔥 EXPORT HELPER FOR MANUAL/ADMIN ROUTE
exports.closeContestAndDistributePrizes = closeContestAndDistributePrizes;