const { BrevoClient } = require("@getbrevo/brevo");
const Goal = require("../../shared models/goal_model");
const User = require("../../shared models/user_model");

// Initialize the correct modern client
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

const senderEmail = process.env.SENDER_EMAIL || "no-reply@yourdomain.com";
const senderName = "Goal Tracker Assistant (focuset)";
const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

/**
 * Helper function to send emails via Brevo with full goal & step details
 */
async function sendBrevoEmail(
  recipientEmail,
  recipientName,
  subject,
  htmlContent,
) {
  try {
    // 1. Validate inputs first before building the email object
    if (!recipientEmail || !subject || !htmlContent) {
      console.log("your arguments are not valid: missing required fields");
      return;
    }

    // 2. Call the modern SDK method directly using a plain JS payload object
    const result = await brevo.transactionalEmails.sendTransacEmail({
      subject: subject,
      htmlContent: htmlContent,
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email: recipientEmail, // Changed from your hardcoded fallback to use the actual variable
          name: recipientName || "Goal Achiever",
        },
      ],
    });

    console.log(
      `Email successfully sent to ${recipientEmail}. Message ID: ${result.messageId}`,
    );
  } catch (err) {
    console.error(
      `Error sending email to ${recipientEmail}:`,
      err.message || err,
    );
  }
}

/**
 * Run at 6:00 AM - Morning Daily Step Reminder
 */
async function sendDailyNoti() {
  try {
    const goals = await Goal.find({
      status: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      "steps.frequency": "Daily",
    }).populate("user"); // Populate user details for email & name

    for (const goal of goals) {
      if (!goal.user || !goal.user.email) continue;

      const currentIndex = goal.lastNotifiedStep ?? 0;
      const step = goal.steps[currentIndex];

      if (step && step.frequency === "Daily" && step.completed === false) {
        const subject = `🌅 Morning Reminder: ${step.name}`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #8b5cf6;">Good morning, ${goal.user.name || "Brilliant"}!</h2>
            <p>Your active goal <strong>"${goal.title}"</strong> has a pending daily step waiting for you today.</p>
            
            <div style="background: #f6f7fb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #111827;">📌 Current Step Details</h3>
              <p style="margin: 5px 0;"><strong>Step:</strong> ${step.name}</p>
              <p style="margin: 5px 0;"><strong>Goal Due Date:</strong> ${new Date(goal.endDate).toDateString()}</p>
              <p style="margin: 5px 0;"><strong>Description:</strong> ${goal.description || "N/A"}</p>
            </div>

            <p>This is another day to step out there and make progress. Consistency is key!</p>
            
            <a href="${baseUrl}" style="display: inline-block; background: #8b5cf6; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold;">View Your Goals</a>
          </div>
        `;

        await sendBrevoEmail(
          goal.user.email,
          goal.user.name,
          subject,
          htmlContent,
        );
        console.log(goal.user.email);
        console.log(goal.user.name);
        console.log(subject);
      } else if (step && step.completed === true) {
        goal.lastNotifiedStep = currentIndex + 1;
        await goal.save();
      }
    }
  } catch (err) {
    console.error("Error in sendDailyNoti:", err);
  }
}

/**
 * Run at 3:00 PM - Afternoon Check-in Reminder
 */
async function sendDailyNotisecond() {
  try {
    const goals = await Goal.find({
      status: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      "steps.frequency": "Daily",
    }).populate("user");

    for (const goal of goals) {
      if (!goal.user || !goal.user.email) continue;

      const currentIndex = goal.lastNotifiedStep ?? 0;
      const step = goal.steps[currentIndex];

      if (step && step.frequency === "Daily" && step.completed === false) {
        const subject = `⚡ Afternoon Check-in: How is "${step.name}" going?`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #8b5cf6;">Afternoon Progress Check</h2>
            <p>Hi ${goal.user.name || "there"}, have you worked on your goal <strong>"${goal.title}"</strong> today?</p>
            
            <div style="background: #f6f7fb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #111827;">📌 Target Step</h3>
              <p style="margin: 5px 0;"><strong>Step:</strong> ${step.name}</p>
            </div>

            <p>It's not too late to check off your task and keep your streak alive!</p>
            
            <a href="${baseUrl}" style="display: inline-block; background: #8b5cf6; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold;">Complete Step Now</a>
          </div>
        `;

        await sendBrevoEmail(
          goal.user.email,
          goal.user.name,
          subject,
          htmlContent,
        );
      } else if (step && step.completed === true) {
        goal.lastNotifiedStep = currentIndex + 1;
        await goal.save();
      }
    }
  } catch (err) {
    console.error("Error in sendDailyNotisecond:", err);
  }
}

/**
 * Run once a day at 8:00 PM - Daily Motivation & Summary
 */
async function sendDailymoti() {
  try {
    const goals = await Goal.find({
      status: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).populate("user");

    for (const goal of goals) {
      if (!goal.user || !goal.user.email) continue;

      const currentIndex = goal.lastNotifiedStep ?? 0;
      const step = goal.steps[currentIndex];

      if (step) {
        const subject = `🌟 Evening Motivation for "${goal.title}"`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #8b5cf6;">Hello Brilliant! ✨</h2>
            <p>Little by little adds up. Smaller steps are the secret to finishing strong on <strong>"${goal.title}"</strong>.</p>
            
            <div style="background: #f6f7fb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Current Focus Step:</strong> ${step.name}</p>
              <p style="margin: 5px 0;"><strong>Overall Goal Timeline:</strong> ${new Date(goal.startDate).toLocaleDateString()} – ${new Date(goal.endDate).toLocaleDateString()}</p>
            </div>

            <p>Keep pushing forward; you are closer than you think!</p>
            
            <a href="${baseUrl}" style="display: inline-block; background: #8b5cf6; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold;">Open Dashboard</a>
          </div>
        `;

        await sendBrevoEmail(
          goal.user.email,
          goal.user.name,
          subject,
          htmlContent,
        );
      }
    }
  } catch (err) {
    console.error("Error in sendDailymoti:", err);
  }
}

/**
 * Run for Weekly Goal/Step Check
 */
async function sendWeeklyNoti() {
  try {
    const goals = await Goal.find({
      status: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      "steps.frequency": "Weekly",
    }).populate("userId");

    for (const goal of goals) {
      if (!goal.user || !goal.user.email) continue;

      const currentIndex = goal.lastNotifiedStep ?? 0;
      const step = goal.steps[currentIndex];

      if (step && step.frequency === "Weekly" && step.completed === false) {
        const subject = `📅 Weekly Milestone Reminder: ${step.name}`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #8b5cf6;">Weekly Goal Milestone</h2>
            <p>You have a weekly milestone waiting for completion under <strong>"${goal.title}"</strong>.</p>
            
            <div style="background: #f6f7fb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Milestone Step:</strong> ${step.name}</p>
              <p style="margin: 5px 0;"><strong>Target Due:</strong> ${new Date(goal.endDate).toDateString()}</p>
            </div>

            <a href="${baseUrl}" style="display: inline-block; background: #8b5cf6; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold;">View Milestone</a>
          </div>
        `;

        await sendBrevoEmail(
          goal.user.email,
          goal.user.name,
          subject,
          htmlContent,
        );
      } else if (step && step.completed === true) {
        goal.lastNotifiedStep = currentIndex + 1;
        await goal.save();
      }
    }
  } catch (err) {
    console.error("Error in sendWeeklyNoti:", err);
  }
}

module.exports = {
  sendDailyNoti,
  sendDailyNotisecond,
  sendDailymoti,
  sendWeeklyNoti,
};
