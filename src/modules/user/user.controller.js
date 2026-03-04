const User = require("./user.model");
const jwt = require("jsonwebtoken");
const admin = require("../../config/firebase");
const crypto = require("crypto"); 
const { sendWelcomeEmail } = require("../../utils/mailer");

/**
 * ARENA HELPER: Generate a unique 6-character alphanumeric code
 */
const generateUniquePromo = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); 
};

/* =========================================
    1. CREATE / LOGIN USER
    🔥 FEATURES: Google Auth & Double Reward System
========================================= */
exports.createUser = async (req, res) => {
  try {
    const { idToken, promoCode } = req.body; 

    if (!idToken) {
      return res.status(400).json({ success: false, message: "No ID Token provided" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, name, email, picture } = decodedToken;

    let user = await User.findOne({ firebaseUID: uid });

    if (!user) {
      let referrerId = null;
      let initialBalance = 0;

      if (promoCode) {
        const referrer = await User.findOne({ 
          promoCode: promoCode.trim().toUpperCase() 
        });

        if (referrer) {
          referrerId = referrer._id;
          initialBalance = 5; // Reward joiner

          await User.findByIdAndUpdate(referrerId, { 
            $inc: { walletBalance: 10, depositBalance: 10 } // 🔥 SYNC: Add to deposit too
          });
        }
      }

      user = await User.create({
        firebaseUID: uid,
        name: name || email.split('@')[0],
        email: email,
        avatar: picture,
        walletBalance: initialBalance,
        depositBalance: initialBalance, // 🔥 SYNC: Ensure initial funds show in deposit
        winningBalance: 0,
        rating: 1000,
        promoCode: generateUniquePromo(), 
        referredBy: referrerId,
        location: { city: "", state: "", country: "India" }
      });

      sendWelcomeEmail(user.email, user.name).catch(err => 
        console.error("Delayed Mail Error:", err.message)
      );
    }

    const token = jwt.sign(
      { id: user._id, _id: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: user
    });

  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: "Authentication failed: " + error.message 
    });
  }
};

/* =========================================
    2. GET OWN PROFILE
========================================= */
exports.getProfile = async (req, res) => {
  try {
    if (!req.user) {
        return res.status(404).json({ success: false, message: "User session not found" });
    }

    let user = await User.findById(req.user._id);

    if (!user.promoCode) {
      user.promoCode = generateUniquePromo();
      await user.save();
    }

    // 🔥 THE CRITICAL FIX: Virtual Migration for UI
    // If the database fields exist but are 0/empty for an old user with a balance,
    // we calculate them on the fly so the Withdrawal Page doesn't show 0.
    const userData = user.toObject();
    if (userData.walletBalance > 0 && userData.depositBalance === 0 && userData.winningBalance === 0) {
        userData.depositBalance = userData.walletBalance;
    }

    res.json({
      success: true,
      data: userData 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
    🔥 3. GET PROFILE BY ID (Public View)
    Ensures you can view other participants without seeing private info
========================================= */
exports.getProfileById = async (req, res) => {
  try {
    const userId = req.params.id;

    // 🔥 PRIVACY GUARD: We only select fields that are safe for public viewing
    const user = await User.findById(userId)
      .select("name avatar rating totalWins totalMatches location.city promoCode privacy role")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "Warrior not found in the Arena" });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Profile Fetch Error: " + error.message });
  }
};

/* =========================================
    4. UPDATE PROFILE
========================================= */
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar, location, privacy } = req.body; 
    const userId = req.user._id;

    if (name && name !== req.user.name) {
      const existingUser = await User.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, "i") }, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "This username is already claimed!" 
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...(name && { name }), 
        ...(avatar && { avatar }),
        ...(location?.city && { "location.city": location.city }),
        ...(privacy && { privacy }) // Allow updating stealth/privacy settings
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Gamer Profile Updated!",
      data: updatedUser 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Update Error: " + error.message });
  }
};

/* =========================================
    5. MANUAL RESET (Admin Tool)
========================================= */
exports.manualResetRankings = async (req, res) => {
  try {
    const { type } = req.body; 
    let updateObj = {};
    
    if (type === 'daily') updateObj = { dailyPoints: 0, "categoryStats.$[].daily": 0 };
    else if (type === 'weekly') updateObj = { weeklyPoints: 0, "categoryStats.$[].weekly": 0 };
    else if (type === 'monthly') updateObj = { monthlyPoints: 0, "categoryStats.$[].monthly": 0 };
    else return res.status(400).json({ success: false, message: "Invalid reset type" });

    await User.updateMany({}, { $set: updateObj });

    res.json({ success: true, message: `${type.toUpperCase()} rankings cleared!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};