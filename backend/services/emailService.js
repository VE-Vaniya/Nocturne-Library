require('dotenv').config({ quiet: true });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify the SMTP connection at startup (skipped in tests / when email is
// not configured).
if (process.env.NODE_ENV !== 'test' && process.env.EMAIL_USER) {
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP Connection Error:', error.message);
    } else {
      console.log('SMTP Server is ready to take our messages');
    }
  });
}

// Never throws: resolves to {success, messageId | error}.
const sendNotificationEmail = async (to, subject, text, html) => {
  if (!process.env.EMAIL_USER) {
    return { success: false, error: 'Email is not configured' };
  }

  const mailOptions = {
    from: `"Nocturne Library" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
    });
    return { success: false, error: error.message };
  }
};

module.exports = { sendNotificationEmail };
