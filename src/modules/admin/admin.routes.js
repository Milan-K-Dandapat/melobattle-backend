const express = require("express");
const router = express.Router();

const adminController = require("./admin.controller");
const userController = require("../user/user.controller");
const contestController = require("../contest/contest.controller"); 

// Middleware
const { protect } = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

// 🔥 GLOBAL PROTECTION: All admin routes require authentication and ADMIN role
// This ensures that only Milan Kumar (Admin) can access these protocols
router.use(protect);
router.use(roleMiddleware("ADMIN"));

/* =========================================
    1. COMMAND CENTER DASHBOARD & STATS
========================================= */

// @route   GET /api/admin/dashboard
// Pulls "Active Warriors," "Today's Revenue," and system health
router.get("/dashboard", adminController.dashboard);

/* =========================================
    2. ARENA CONTEST MANAGEMENT
    Synchronized with Dashboard Real-time UI
========================================= */

// @route   POST /api/admin/contests
// Deploys a new battle. Triggers Socket.io "NEW_CONTEST_DEPLOYED" event
router.post("/contests", contestController.createContest);

// @route   PUT /api/admin/contests/:id
// Updates battle details (Prize pool, Entry fees, or Timing)
router.put("/contests/:id", contestController.updateContest);

// @route   DELETE /api/admin/contests/:id
// Terminate battle protocol. Removes card from Dashboard instantly
router.delete("/contests/:id", contestController.deleteContest);

/* =========================================
    3. USER & RANKING PROTOCOLS
========================================= */

// @route   POST /api/admin/reset-rankings
// 🔥 UPDATED: Manually triggers ELO/Ranking resets for Daily, Weekly, or Monthly cycles
// Points to adminController to ensure prize history is also purged
router.post("/reset-rankings", adminController.resetRankings);

// @route   GET /api/admin/users
// Manage all registered warriors in the matrix
router.get("/users", adminController.getAllUsers);

// @route   PUT /api/admin/users/block/:id
// Toggle "Banned/Restricted" status for specific users
router.put("/users/block/:id", adminController.toggleUserBlock);

module.exports = router;