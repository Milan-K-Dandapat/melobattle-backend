const admin = require("../../config/firebase");
const User = require("../user/user.model");
const jwt = require("jsonwebtoken");

exports.verifyGoogleUser = async (idToken) => {
  try {
    // 1. Verify the ID token from the frontend using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

let user = await User.findOne({ firebaseUID: uid });

// 🔥 If user exists but email changed (edge case)
if (!user) {
  user = await User.findOne({ email });
}

if (!user) {
  user = await User.create({
    email,
    name: `${email.split("@")[0]}_${Date.now()}`, // guaranteed unique
    avatar: picture,
    firebaseUID: uid,
    role: "USER",
    walletBalance: 0
  });
} else {
  // 🔥 OPTIONAL: keep user updated
  user.avatar = picture || user.avatar;
  user.email = email || user.email;
  await user.save();
}

    // 3. Generate a local JWT for session management
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { user, token };
  } catch (error) {
    console.error("🔥 AUTH ERROR:", error);
throw error;
  }
};