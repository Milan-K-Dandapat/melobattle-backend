const walletService = require("../wallet/wallet.service");
const Transaction = require("../wallet/transaction.model"); // 🔥 Added for daily limit check
const Withdrawal = require("../withdrawal/withdrawal.model"); // 🔥 FIX: Points to the 'withdrawals' collection seen in your DB
const User = require("../user/user.model"); // 🔥 Added to ensure fresh user data is sent back

/* =========================================
    ADD BALANCE (DEPOSIT)
========================================= */
exports.deposit = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      throw new Error("Please provide a valid deposit amount");
    }

    const user = await walletService.addBalance(
      req.user._id,
      amount,
      "DEPOSIT"
    );

    res.json({
      success: true,
      message: "Balance added successfully",
      data: user
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================================
    DEDUCT BALANCE (ENTRY FEE)
========================================= */
exports.deduct = async (req, res) => {
  try {
    const { amount } = req.body;

    const user = await walletService.deductBalance(
      req.user._id,
      amount,
      "ENTRY_FEE"
    );

    res.json({
      success: true,
      message: "Entry fee deducted",
      data: user
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================================
    🔥 SECURE PAYOUT (WITHDRAWAL)
    FIXED: Ensures deduction from 'winningBalance' to sync UI
========================================= */
exports.withdraw = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const userId = req.user._id;

    if (!amount || Number(amount) < 20) {
      throw new Error("Minimum withdrawal amount is ₹20");
    }

    // 1. 🔥 FORCE CALENDAR DAY BOUNDARIES (00:00:00 to 23:59:59)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 2. 🔥 AGGREGATE FROM CORRECT COLLECTION ('withdrawals')
    const dailyTotalResponse = await Withdrawal.aggregate([
      {
        $match: {
          userId: userId,
          status: "SUCCESS", 
          createdAt: { 
            $gte: todayStart, 
            $lte: todayEnd 
          }
        }
      },
      { 
        $group: { 
          _id: null, 
          totalAmount: { $sum: "$amount" } 
        } 
      }
    ]);

    const totalWithdrawnToday = dailyTotalResponse[0]?.totalAmount || 0;
    const DAILY_LIMIT = 1000;

    // 3. 🔥 ENFORCE LIMIT CHECK
    if (totalWithdrawnToday + Number(amount) > DAILY_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Daily withdrawal limit of ₹${DAILY_LIMIT} exceeded. You have already used ₹${totalWithdrawnToday} today.`
      });
    }

    // 4. EXECUTE AUTO-APPROVED PAYOUT
    // Deducting from winningBalance
    // 🔥 We wait for the service to finish completely before moving to the next line
    await walletService.deductBalance(
      userId,
      amount,
      "WITHDRAW",
      { upiId, status: "SUCCESS", isWinning: true } 
    );

    // 5. 🔥 CRITICAL FIX: Fetch the absolute LATEST user profile
    // Using .lean() to get a plain JavaScript object which avoids Mongoose caching issues.
    // This ensures 'winningBalance' is 100% updated for the UI.
    const updatedUser = await User.findById(userId).lean();

    res.json({
      success: true,
      message: "Payout processed successfully",
      data: updatedUser // Returning the full fresh user object to the frontend
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================================
    USER TRANSACTION HISTORY
========================================= */
exports.getMyTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    const data = await walletService.getUserTransactions(
      req.user._id,
      parseInt(page),
      parseInt(limit),
      type
    );

    res.json({ success: true, data });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================================
    ADMIN VIEW ALL TRANSACTIONS
========================================= */
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const data = await walletService.getAllTransactions(
      parseInt(page),
      parseInt(limit)
    );

    res.json({ success: true, data });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};