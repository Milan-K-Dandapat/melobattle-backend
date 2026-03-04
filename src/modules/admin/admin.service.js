const User = require("../user/user.model");
const Contest = require("../contest/contest.model");
const Transaction = require("../wallet/transaction.model");

/* =========================================
   1. MAIN DASHBOARD ANALYTICS
   Provides lifetime performance data
========================================= */
exports.getDashboardStats = async () => {
  try {
    // 🔥 Parallel execution for maximum performance
    const [
      totalUsers, 
      totalContests, 
      totalDeposits, 
      totalWithdrawals, 
      totalEntryFees, 
      totalWins
    ] = await Promise.all([
      User.countDocuments(),
      Contest.countDocuments(),
      Transaction.aggregate([
        { $match: { type: "DEPOSIT", status: "SUCCESS" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { type: "WITHDRAWAL", status: "SUCCESS" } }, // Fixed type name to WITHDRAWAL
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { type: "ENTRY_FEE", status: "SUCCESS" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { type: "WINNING", status: "SUCCESS" } }, // Fixed type name to WINNING
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const deposits = totalDeposits[0]?.total || 0;
    const withdrawals = totalWithdrawals[0]?.total || 0;
    const entryFees = totalEntryFees[0]?.total || 0;
    const wins = totalWins[0]?.total || 0;

    // 🔥 UPDATED PROFIT LOGIC: 
    // Net Profit is the commission kept by the house (Entry Fees - Payouts)
    const netProfit = entryFees - wins;

    return {
      totalUsers,
      totalContests,
      totalDeposits: deposits,
      totalWithdrawals: withdrawals,
      totalEntryFees: entryFees,
      totalPrizeDistributed: wins,
      // Ensure we don't show negative profit during processing
      netProfit: netProfit > 0 ? netProfit : 0
    };
  } catch (error) {
    throw new Error("Dashboard Analytics Engine Error: " + error.message);
  }
};

/* =========================================
   2. TODAY'S PERFORMANCE (24h CYCLE)
   Real-time monitoring of growth and revenue
========================================= */
exports.getTodayStats = async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayFees, todayWins, todayUsers] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: "ENTRY_FEE", status: "SUCCESS", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { type: "WINNING", status: "SUCCESS", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      User.countDocuments({ createdAt: { $gte: todayStart } })
    ]);

    const fees = todayFees[0]?.total || 0;
    const wins = todayWins[0]?.total || 0;
    
    // 🔥 REAL REVENUE: Today's commission profit (Collection minus Distributions)
    const netRevenueToday = fees - wins;

    return {
      todayRevenue: netRevenueToday > 0 ? netRevenueToday : 0,
      newUsersToday: todayUsers,
      todayEntryFees: fees
    };
  } catch (error) {
    throw new Error("Today's Sync Protocol Error: " + error.message);
  }
};