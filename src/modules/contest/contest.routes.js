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
  async (req, res) => {
    try {
      const Contest = require("./contest.model");
      const contest = await Contest.findById(req.params.id);
      if (!contest) return res.status(404).json({ success: false, message: "Contest not found" });
      
      contest.status = "COMPLETED";
      await contest.save();
      
      // Call the prize distribution helper from your controller
      // Ensure you exported closeContestAndDistributePrizes in contest.controller.js
      if (contestController.closeContestAndDistributePrizes) {
          await contestController.closeContestAndDistributePrizes(contest, req.app.get("io"));
      }

      res.json({ success: true, message: "Contest closed and prizes distributed manually." });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
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