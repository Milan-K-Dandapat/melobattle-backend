const admin = require("../../config/firebase");
const User = require("../user/user.model");
const jwt = require("jsonwebtoken");

exports.verifyGoogleUser = async (idToken) => {
  try {
    // 1. Verify the ID token from the frontend using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);

// 🔥 ADD THIS LINE HERE
console.log("Decoded Token:", decodedToken);

const { email, name, picture, uid } = decodedToken;

    // 2. Find or create the user in your database
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name,
        avatar: picture,
        firebaseUid: uid,
        role: "USER", // Default role
        walletBalance: 0
      });
    }

    // 3. Generate a local JWT for session management
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { user, token };
  } catch (error) {
    throw new Error("Invalid Google Token: " + error.message);
  }
};