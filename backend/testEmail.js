require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.MANAGER_EMAIL,
    subject: "📧 Test Email from Bioton Backend",
    text: "This is a test email to verify if the email sending feature is working."
};

transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
        console.error("❌ Error sending email:", err);
    } else {
        console.log("✅ Email sent successfully:", info.response);
    }
});
