const { BrevoClient } = require("@getbrevo/brevo");
const forgetPasswordTemplate = require("../../EmailTemplates/forgetPasswordEmail");
// const forgotPasskeyTemplate = require("../../EmailTemplates/forgotpasskeyEmail");

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

const sendUniversalMail = async (type, options) => {
  const {
    recipientEmail,
    recipientName,
    subject,
    otpCode,
    personOrg,
    custome,
    resetToken,
  } = options;
  const currentYear = new Date().getFullYear();

  // Basic input validation guard
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.error(
      `[Mail Aborted] Cannot send email. Address is invalid: ${recipientEmail}`,
    );
    return null; // 🚀 CRITICAL FIX: Explicitly returns and halts execution instantly!
  }

  let htmlContent = "";

  // Fixed the broken bracket syntax structure here:
  if (type === "forgetPassword") {
    htmlContent = forgetPasswordTemplate(custome, currentYear);
  } else if (type === "FORGOT_PASSKEY") {
    htmlContent = forgetPasswordTemplate(resetToken, currentYear, personOrg);
  } else {
    throw new Error(`Unknown email template type requested: ${type}`);
  }

  try {
    const data = await brevo.transactionalEmails.sendTransacEmail({
      to: [{ email: recipientEmail, name: recipientName || "User" }],
      sender: { email: "elikemjjames@gmail.com", name: "Focuset" },
      subject: subject,
      htmlContent: htmlContent,
    });

    console.log(
      `Email [${type}] successfully routed to ${recipientEmail}. Message ID:`,
      data.messageId,
    );
    return data;
  } catch (error) {
    console.error(
      `Failed to route universal mail to ${recipientEmail}:`,
      error,
    );
    throw error;
  }
};

// Placeholder to prevent module.exports from throwing an undefined crash error
const sendMail = async (options) => {
  console.log("sendMail function placeholder triggered with options:", options);
};

module.exports = { sendMail, sendUniversalMail };
