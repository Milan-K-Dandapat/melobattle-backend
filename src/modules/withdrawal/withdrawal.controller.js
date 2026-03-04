const withdrawalService = require("./withdrawal.service");
const Withdrawal = require("./withdrawal.model"); // 🔥 FIX: Required for daily limit aggregation

/* =========================================
    USER REQUEST WITHDRAWAL
========================================= */
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const userId = req.user._id;

    // 1. 🔥 DEFINE TODAY'S ABSOLUTE CALENDAR BOUNDARIES (00:00:00 to 23:59:59)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 2. 🔥 AGGREGATE TODAY'S WITHDRAWALS FROM THE CORRECT COLLECTION
    // Based on your DB screenshot, we check for 'SUCCESS' status
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

    // 3. 🔥 ENFORCE THE LIMIT
    if (totalWithdrawnToday + Number(amount) > DAILY_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Daily withdrawal limit of ₹${DAILY_LIMIT} exceeded. You have already used ₹${totalWithdrawnToday} today.`
      });
    }

    // 4. PROCEED TO SERVICE
    // Updated to call your service logic which handles balance deduction and SUCCESS status
    const result = await withdrawalService.requestWithdrawal(userId, amount, upiId);
    
    res.json({
      success: true,
      message: "Withdrawal processed successfully",
      data: result // Returns the updated user profile with synced winningBalance
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* =========================================
    FETCH USER WITHDRAWAL HISTORY
========================================= */
exports.getMyWithdrawals = async (req, res) => {
  try {
    // 🔥 Fetches from the 'withdrawals' collection via the service helper
    const data = await withdrawalService.getUserWithdrawals(req.user._id);
    
    // Ensure success: true is sent so frontend sets history state correctly
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
    ADMIN VIEW ALL WITHDRAWALS
========================================= */
exports.getAllWithdrawals = async (req, res) => {
  try {
    // 🔥 Fetches all requests for the admin panel
    const data = await withdrawalService.getPendingWithdrawals(); // Adjusted to match your service helper name
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};