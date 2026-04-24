const ExamAuth = require("./examAuth.model");
const bcrypt = require("bcryptjs");

exports.loginExam = async (req, res) => {
  try {
    const { userId, password, contestId } = req.body;

    const user = await ExamAuth.findOne({ userId, contestId });

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
    const { userId, password, contestId } = req.body;

    // check if already exists
    const existing = await ExamAuth.findOne({ userId, contestId });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // save in DB
    const newUser = new ExamAuth({
      userId,
      password: hashedPassword,
      contestId
    });

    await newUser.save();

    res.json({ success: true, message: "User created successfully" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};