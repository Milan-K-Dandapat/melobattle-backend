const User = require("../user/user.model");

const K = 32; // adjustment factor

exports.updateRatings = async (rankings) => {
  const totalPlayers = rankings.length;

  for (let i = 0; i < rankings.length; i++) {
    const user = await User.findById(rankings[i]);

    if (!user) continue;

    const percentile = 1 - i / totalPlayers; // higher rank = higher percentile

    const expected = 0.5; // simplified expectation

    const newRating =
      user.rating + K * (percentile - expected);

    user.rating = Math.round(newRating);
    await user.save();
  }
};
