const express = require("express");
const router = express.Router();
const contestController = require("./contest.controller");
const { protect } = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");


/* =========================================
    1. ADVANCED LEADERBOARD & FILTERS
========================================= */

/**
 * @route   GET /api/v1/contest/leaderboard/:category/:timeframe
 * @desc    Fetch global or category-specific leaderboard (Daily, Weekly, Monthly, Nearby, All Time)
 * @access  Protected
 */
router.get(
  "/leaderboard/:category/:timeframe", 
  protect, 
  contestController.getAdvancedLeaderboard // 🔥 This powers your new Leaderboard.jsx filters
);

router.get("/upcoming", protect, contestController.getUpcomingContests);
router.get("/my-contests", protect, contestController.getMyContests);
router.get("/", protect, contestController.getAllContests);
router.post("/:contestId/join", protect, contestController.joinContest);
router.post("/start-battle", protect, contestController.startBattle);
router.post("/submit", protect, contestController.submitBattle);
router.post("/submit-score", protect, contestController.submitScore);
router.post("/disqualify", protect, contestController.disqualifyContest);
router.get("/:contestId/leaderboard", protect, contestController.getLeaderboard);
router.get("/battle/:id", protect, contestController.getBattleQuestions);

/* =========================================
    4. ADMIN & MANAGEMENT PROTOCOLS (Restricted)
========================================= */

router.post(
  "/create", 
  protect, 
  roleMiddleware("ADMIN"), 
  contestController.createContest
);

/**
 * 🔥 NEW: MANUAL CONTEST CLOSURE & PRIZE DISPATCH
 * Use this if a game is stuck in 'LIVE' to force distribute winnings.
 */
router.post(
  "/:id/force-close",
  protect,
  roleMiddleware("ADMIN"),
  contestController.forceCloseContest
);
router.put(
  "/:id", 
  protect, 
  roleMiddleware("ADMIN"), 
  contestController.updateContest
);

router.delete(
  "/:id", 
  protect, 
  roleMiddleware("ADMIN"), 
  contestController.deleteContest
);
router.get("/:id/export", protect, roleMiddleware("ADMIN"), contestController.exportContestCSV);
router.get("/:id", protect, contestController.getContestById);



module.exports = router;