const ExamAuth = require("./examAuth.model");
const bcrypt = require("bcryptjs");

exports.loginExam = async (req, res) => {
  try {
    const { userId, password, contestId } = req.body;
    if (!userId || !password || !contestId) {
  return res.status(400).json({
    success: false,
    message: "Missing credentials"
  });
}

    const user = await ExamAuth.findOne({
  userId,
  $or: [
    { contestId: contestId },  // assigned user
    { contestId: null }        // unassigned user
  ]
});

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid ID" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Wrong password" });
    }

    // optional: block reuse
    if (user.isUsed) {
      return res.status(403).json({ success: false, message: "Already used" });
    }

    user.isUsed = true;
    await user.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.createExamUser = async (req, res) => {
  try {
    const { userId, password } = req.body;

    await ExamAuth.deleteOne({ userId });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new ExamAuth({
      userId,
      password: hashedPassword,
      contestId: null
    });

    await newUser.save();

    // ✅ FIXED LINE
    const users = await ExamAuth.find({ contestId: null });

    res.json({
      success: true,
      message: "User created successfully",
      users
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.assignUsersToContest = async (req, res) => {
  try {
    const { contestId, userIds } = req.body;

    await ExamAuth.updateMany(
      { userId: { $in: userIds } },
      { $set: { contestId } }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};
exports.getAllExamUsers = async (req, res) => {
  try {
    const users = await ExamAuth.find({ contestId: null });

    res.json({
      success: true,
      users
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};