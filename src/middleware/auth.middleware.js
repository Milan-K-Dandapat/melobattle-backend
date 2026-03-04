const jwt = require("jsonwebtoken");
const User = require("../modules/user/user.model");

/**
 * ARENA ELITE AUTH GUARD
 * Protects routes and attaches user data to req.user
 */
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check for Bearer token in headers
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify the token against the backend secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * 3. Fetch user from MongoDB
     * 🔥 FIXED: Checking both 'id' and '_id' to ensure compatibility with 
     * different JWT signing versions
     */
    const userId = decoded.id || decoded._id || decoded.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token - User not found" 
      });
    }

    // 4. Attach user to request for use in controllers
    req.user = user; 
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    
    // 🔥 Provide specific feedback for the "Invalid token" alert
    const message = error.name === "TokenExpiredError" 
      ? "Session expired, please login again" 
      : "Invalid token";

    res.status(401).json({ 
      success: false, 
      message 
    });
  }
};