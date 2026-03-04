const nodemailer = require("nodemailer");

/**
 * ARENA ELITE MAIL PROTOCOL
 * Sends a premium welcome email to new warriors
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS, // App Password
  },
});

// 🔥 Changed from 'export const' to 'const'
const sendWelcomeEmail = async (userEmail, userName) => {
  const mailOptions = {
    from: `"Arena Elite" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "🔥 Welcome to the Arena, Warrior!",
    html: `
      <div style="background-color: #050810; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 20px;">
        <h1 style="color: #9333ea; font-style: italic; text-transform: uppercase;">Melo Battle: Arena Elite</h1>
        <p>Greetings, <b>${userName}</b>,</p>
        <p>Your identity has been synchronized with the Arena. You are now authorized to compete in global brackets and climb the rankings.</p>
        <div style="background: #1e1b4b; padding: 20px; border-radius: 15px; border: 1px solid #4338ca;">
          <p style="margin: 0; font-weight: bold; color: #a5b4fc;">RANK: UNRANKED (#N/A)</p>
          <p style="margin: 0; font-weight: bold; color: #a5b4fc;">ELO: 1000</p>
        </div>
        <p style="margin-top: 20px;">The Daily Season has begun. We will see you on the leaderboard.</p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;">
        <p style="font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 2px;">Automated System • Do not reply</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email dispatched to ${userEmail}`);
  } catch (error) {
    console.error("❌ Mailer Error:", error);
  }
};

// 🔥 Use module.exports for CommonJS
module.exports = { sendWelcomeEmail };