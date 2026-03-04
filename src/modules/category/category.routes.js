const express = require("express");
const router = express.Router();
const categoryController = require("./category.controller");
const { protect } = require("../../middleware/auth.middleware"); 
const roleMiddleware = require("../../middleware/role.middleware"); 

// Route 1: Anyone can fetch the categories for the dashboard
router.get("/", categoryController.getCategories);

// Route 2: Only the Supreme Commander (ADMIN) can add new fields/sub-fields
router.post("/", protect, roleMiddleware("ADMIN"), categoryController.addCategoryOrSub);

// 🔥 This is the line that prevents the crash you just got!
module.exports = router;