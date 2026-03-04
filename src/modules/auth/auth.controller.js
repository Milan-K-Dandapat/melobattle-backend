const authService = require("./auth.service");

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID Token is required" });
    }

    const { user, token } = await authService.verifyGoogleUser(idToken);

    res.status(200).json({
      success: true,
      data: { user, token }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};