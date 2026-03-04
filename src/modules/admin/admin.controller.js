const adminService = require("./admin.service");
const User = require("../user/user.model");
const Participant = require("../contest/participant.model"); // 🔥 Added for Matrix Purge

/**
 * @desc    Get Admin Dashboard Analytics
 * @route   GET /api/admin/dashboard
 * Includes lifetime totals and today's 24h performance
 */
exports.dashboard = async (req, res) => {
  try {
    // Parallelize service calls to maximize "Command Center" responsiveness
    const [stats, today] = await Promise.all([
      adminService.getDashboardStats(),
      adminService.getTodayStats()
    ]);

    res.json({
      success: true,
      message: "Arena Intelligence Synchronized",
      data: {
        stats: stats || { totalUsers: 0, totalContests: 0, netProfit: 0 },
        today: today || { todayRevenue: 0, newUsersToday: 0 }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Protocol Failure: Dashboard analytics unreachable"
    });
  }
};

/**
 * @desc    Fetch All Matrix Warriors
 * @route   GET /api/admin/users
 * Used for user management and performance monitoring
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email role walletBalance totalWins location isBlocked createdAt rating")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users || []
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Warrior Registry Sync Failed: " + error.message 
    });
  }
};

/**
 * @desc    Toggle Warrior Access Status (Banning Protocol)
 * @route   PUT /api/admin/users/block/:id
 * Allows the CEO to restrict unauthorized or malicious users
 */
exports.toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Warrior target not found" });
    }

    // 🔥 SECURITY PROTOCOL: CEO/Admin account protection
    if (user.role === "ADMIN") {
      return res.status(403).json({ 
        success: false, 
        message: "Authority Override Denied: Cannot restrict an administrator account" 
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: `Protocol Executed: Warrior ${user.isBlocked ? "Banned" : "Restored"} successfully`,
      data: { 
        userId: user._id,
        isBlocked: user.isBlocked 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Toggle Protocol Failed: " + error.message 
    });
  }
};

/**
 * 🔥 UPDATED: SYSTEM RESET PROTOCOL
 * @desc    Flushes rankings and clears prize data to ensure fresh distribution
 * @route   POST /api/admin/reset-rankings
 */
exports.resetRankings = async (req, res) => {
  const { type } = req.body; // 'daily', 'weekly', 'monthly'

  try {
    let userUpdate = {};
    
    // 1. Determine which User fields to flush
    if (type === 'daily') {
      userUpdate = { dailyPoints: 0 };
    } else if (type === 'weekly') {
      userUpdate = { weeklyPoints: 0 };
    } else if (type === 'monthly') {
      userUpdate = { monthlyPoints: 0 };
    } else {
      return res.status(400).json({ success: false, message: "Invalid Reset Type" });
    }

    // 2. 🔥 THE CRITICAL FIX: Clear Participant History for the period
    // This ensures that 'prizeWon' logic starts fresh for the next cycle
    await Participant.updateMany(
      {}, 
      { $set: { prizeWon: 0, rank: 0 } }
    );

    // 3. Flush User Points
    await User.updateMany({}, { $set: userUpdate });

    console.log(`🧹 Matrix Purge: ${type.toUpperCase()} cycle reset successfully.`);

    res.json({ 
      success: true, 
      message: `${type.toUpperCase()} reset complete. Prize data and rankings cleared.` 
    });

  } catch (error) {
    console.error("🔥 Reset Failure:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};