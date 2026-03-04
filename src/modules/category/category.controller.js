const Category = require("./category.model");

// Initial Mandatory Categories (Seeds the DB if empty)
const DEFAULT_CATEGORIES = [
  { name: "GK", subCategories: ["Current Affairs", "Indian GK", "World Facts", "Award & Honors", "Important Days"] },
  { name: "Coding", subCategories: ["HTML/CSS/JS", "React", "NODE JS", "MONGO DB", "C", "C++", "JAVA", "PYTHON", "DEBUG THE CODE", "OUTPUT PREDICTION"] },
  { name: "MOVIES", subCategories: ["Bollywood", "South Movies", "Hollywood", "Web Series", "Dialouges Guess"] },
  { name: "SPORTS", subCategories: ["Cricket", "Football", "IPL", "Olympics", "Cricket Player Records", "Football Player Records", "Hockey"] },
  { name: "Music", subCategories: ["Guess the Song", "Lyrics Completion", "Singer Identify", "Background Music"] },
  { name: "Gaming", subCategories: ["BGMI", "FREE FIRE", "GTA", "ESPORTS", "GAMING Facts"] },
  { name: "Brain & Logic", subCategories: ["Riddles", "Math Tricks", "IQ Questions", "Logical Puzzles"] },
  { name: "Logical Reasoning", subCategories: ["Series & Pattern", "Blood Relations", "Coding - Decoding", "Seating Arrangement", "Syllogism"] },
  { name: "English & Language", subCategories: ["Grammer", "Vocabulary", "Synonyms / Antonyms", "Idioms & Phrases", "Error Detection"] },
  { name: "Business & Finance", subCategories: ["Stock Market Basics", "Indian Economy", "Budget & Tax", "Startup Knowledge", "Famous CEOs"] },
  { name: "Constitution", subCategories: ["Indian Constitution", "Fundamental Rights", "Parliament & President", "Amendments", "Important Articles"] },
  { name: "Environment & Ecology", subCategories: ["Climate Change", "Wildlife", "Pollution", "National Parks", "Sustainable Development"] },
  { name: "Culture", subCategories: ["Indian Cuisiness", "Festivals", "Traditional Dresses", "World Culture", "Famous Dishes"] },
  { name: "Health & Fitness", subCategories: ["Human Body", "Nutrition", "Diseases & Prevention", "Mental Health Awareness"] },
  { name: "Space & Technology", subCategories: ["ISRO Missions", "NASA Missions", "Planets & Galaxies", "Space Discoveries"] },
  { name: "ART & Creativity", subCategories: ["Famous Paintings", "Artists", "Architecture", "Literature", "Poetry"] },
  { name: "Mystery & Detective Mode", subCategories: ["Solve the Case", "Find the Clue", "Guess the Criminal", "Escape Room Questions"] },
  { name: "LIVE CODING SOLVE", subCategories: ["General"] }
];

exports.getCategories = async (req, res) => {
  try {
    let categories = await Category.find().sort({ createdAt: 1 });
    
    // Auto-seed database if it's completely empty
    if (categories.length === 0) {
      await Category.insertMany(DEFAULT_CATEGORIES);
      categories = await Category.find().sort({ createdAt: 1 });
    }

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addCategoryOrSub = async (req, res) => {
  try {
    const { name, subCategory } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Main category name required" });

    // Check if main category exists
    let category = await Category.findOne({ name });

    if (!category) {
      // Create new main category
      category = await Category.create({ 
        name, 
        subCategories: subCategory ? [subCategory] : ["General"] 
      });
      return res.status(201).json({ success: true, message: "New Domain Created", data: category });
    }

    // If it exists, add the new subCategory to it
    if (subCategory && !category.subCategories.includes(subCategory)) {
      category.subCategories.push(subCategory);
      await category.save();
      return res.json({ success: true, message: "Sub-Domain Added", data: category });
    }

    res.json({ success: true, message: "Category already exists", data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};