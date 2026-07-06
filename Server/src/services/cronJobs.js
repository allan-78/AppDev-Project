import cron from "node-cron";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { Community } from "../models/Community.js";
import { User } from "../models/User.js";
import { adjustTrustPoints } from "./trustService.js";
import { notifyUser } from "./notificationService.js";

// Run every day at midnight (0 0 * * *)
export function initCronJobs() {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily check for overdue borrow requests and due reminders...");
    try {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      // 1. Mark overdue borrow requests & apply late penalties
      const activeBorrows = await BorrowRequest.find({
        status: { $in: ["picked_up", "overdue"] }
      }).populate("tool");

      for (const borrow of activeBorrows) {
        if (today > borrow.endDate) {
          // It's overdue!
          if (borrow.status !== "overdue") {
            borrow.status = "overdue";
            await borrow.save();
          }

          // Reconcile community late penalties
          const community = await Community.findById(borrow.community);
          const penaltyAmount = community?.trustRules?.latePenaltyPerDay || 5;

          await adjustTrustPoints({
            userId: borrow.borrower,
            community: borrow.community,
            amount: -penaltyAmount,
            type: "penalty",
            reason: `Overdue item: ${borrow.tool?.name || "borrowed tool"}. Daily penalty applied.`,
            relatedTool: borrow.tool?._id,
            relatedBorrowRequest: borrow._id
          });

          await notifyUser(borrow.borrower, {
            title: "Overdue alert and penalty",
            message: `Your borrowing of ${borrow.tool?.name || "the tool"} is overdue. A daily penalty of ${penaltyAmount} trust points has been deducted.`,
            type: "borrow",
            data: { borrowRequestId: borrow._id }
          });
        }
      }

      // 2. Reminders: find items due tomorrow
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      const dueTomorrow = await BorrowRequest.find({
        status: "picked_up",
        endDate: { $gte: startOfTomorrow, $lte: endOfTomorrow }
      }).populate("tool");

      for (const item of dueTomorrow) {
        await notifyUser(item.borrower, {
          title: "Return reminder",
          message: `Remember to return ${item.tool?.name || "your borrowed tool"} by tomorrow to avoid late penalties.`,
          type: "borrow",
          data: { borrowRequestId: item._id }
        });
      }

    } catch (error) {
      console.error("Error running daily cron jobs:", error);
    }
  });

  // 3. Monthly Good Standing Bonus: Run at midnight on the 1st of every month (0 0 1 * *)
  cron.schedule("0 0 1 * *", async () => {
    console.log("Running monthly good standing bonus job...");
    try {
      // Find approved users with trustPoints > 50 who have no active penalties in the past 30 days
      const users = await User.find({ status: "approved", trustPoints: { $gt: 50 } });
      for (const user of users) {
        // Award good standing bonus
        await adjustTrustPoints({
          userId: user._id,
          community: user.community,
          amount: 2,
          type: "reward",
          reason: "Monthly good standing bonus"
        });

        await notifyUser(user._id, {
          title: "Good standing bonus",
          message: "You have been awarded +2 trust points for keeping a good standing this month!",
          type: "reward"
        });
      }
    } catch (error) {
      console.error("Error running monthly good standing bonus:", error);
    }
  });
}
