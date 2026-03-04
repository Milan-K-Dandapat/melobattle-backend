const User = require("../modules/user/user.model");

module.exports = async (req, res, next) => {
  try {
    const { adminId } = req.body; // temporary simple approach

    if (!adminId)
      return res.status(401).json({ message: "Admin ID required" });

    const admin = await User.findById(adminId);

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
