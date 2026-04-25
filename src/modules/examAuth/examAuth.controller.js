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
  contestId
});

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid ID" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Wrong password" });
    }
// 🔥 OPTIONAL TRACKING (NO BLOCK)
user.isUsed = true;
await user.save();
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.createExamUser = async (req, res) => {
  try {
    const { userId, password, contestId } = req.body;

   await ExamAuth.deleteOne({ userId, contestId });

    const hashedPassword = await bcrypt.hash(password, 10);

 const newUser = new ExamAuth({
  userId,
  password: hashedPassword,
  plainPassword: password, // 🔥 ADD THIS LINE
  contestId
});

    await newUser.save();

    // ✅ FIXED LINE
    const users = await ExamAuth.find({ contestId }).select("+plainPassword");

    res.json({
      success: true,
      message: "User created successfully",
      users
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.getUsersByContest = async (req, res) => {
  try {
    const { contestId } = req.params;

    const users = await ExamAuth.find({ contestId }).select("+plainPassword");

    res.json({
      success: true,
      users
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};
// 🔥 DELETE USER
exports.deleteExamUser = async (req, res) => {
  try {
    const user = await ExamAuth.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      userId: user?.userId,
      contestId: user?.contestId
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};