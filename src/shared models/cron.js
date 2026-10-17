const cron = require("node-cron");
const {
  sendDailyNoti,
  sendWeeklyNoti,
  sendDailyNotisecond,
  sendDailymoti,
} = require("../modules/notification & reward module/controller");

/**
 * ==========================================
 * GOAL NOTIFICATION CRON JOBS (VIA BREVO)
 * ==========================================
 */

// // [TESTING / DEBUGGING]: Runs every single minute
// cron.schedule("* * * * *", async () => {
//   console.log("Running test notification job (Every minute)...");
//   try {
//     await sendDailyNoti();
//   } catch (err) {
//     console.error("Error in test cron job:", err);
//   }
// });

// At 06:00 and 10:00 every day - Morning Step Reminders
cron.schedule("0 6,10 * * *", async () => {
  console.log("Running morning notification job (6 AM / 10 AM)...");
  try {
    await sendDailyNoti();
  } catch (err) {
    console.error("Error in morning notification job:", err);
  }
});

// At 15:00 (1:00 PM) every day - Afternoon Check-in Reminder
cron.schedule("0 13 * * *", async () => {
  console.log("Running afternoon notification job (3 PM)...");
  try {
    await sendDailyNotisecond();
  } catch (err) {
    console.error("Error in afternoon notification job:", err);
  }
});

// At 20:00 (8:00 PM) every day - Evening Motivation & Summary
cron.schedule("0 20 * * *", async () => {
  console.log("Running evening motivation job (8 PM)...");
  try {
    await sendDailymoti();
  } catch (err) {
    console.error("Error in evening motivation job:", err);
  }
});

// Every Sunday at midnight (00:00) - Weekly Milestone Reminders
cron.schedule("0 0 * * 0", async () => {
  console.log("Running weekly notification job (Sunday Midnight)...");
  try {
    await sendWeeklyNoti();
  } catch (err) {
    console.error("Error in weekly notification job:", err);
  }
});

console.log("📅 Notification cron jobs initialized successfully.");
