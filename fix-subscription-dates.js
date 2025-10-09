const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Simple function to add one month to a date
function addOneMonth(date) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

async function fixSubscriptionDates() {
  try {
    const tenantId = "cmghev0c50001yi3lj42ckskc";

    console.log("🔧 FIXING SUBSCRIPTION DATES");
    console.log("============================");

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      console.log("❌ No subscription found");
      return;
    }

    console.log("\n📋 CURRENT SUBSCRIPTION:");
    console.log(`   Plan: ${subscription.plan.name}`);
    console.log(`   Current Period Start: ${subscription.currentPeriodStart}`);
    console.log(`   Current Period End: ${subscription.currentPeriodEnd}`);

    // Get transactions to understand the payment history
    const transactions = await prisma.transaction.findMany({
      where: { tenantId },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const starterTransaction = transactions.find(
      (tx) => tx.subscriptionPlan?.name === "Starter" && tx.status === "PAID"
    );
    const professionalTransaction = transactions.find(
      (tx) =>
        tx.subscriptionPlan?.name === "Professional" && tx.status === "PAID"
    );

    if (!starterTransaction || !professionalTransaction) {
      console.log("❌ Could not find required transactions");
      return;
    }

    // Calculate what the dates should be
    const starterStartDate = new Date(starterTransaction.createdAt);
    const starterShouldEndDate = addOneMonth(starterStartDate);

    console.log("\n🎯 PROPOSED FIXES:");
    console.log("==================");

    console.log('\n📋 OPTION 1: Honor "End of Period" Upgrade');
    console.log("   - Keep Professional plan active");
    console.log(
      `   - Adjust start date to: ${starterShouldEndDate.toLocaleDateString()}`
    );
    console.log(
      `   - Adjust end date to: ${addOneMonth(
        starterShouldEndDate
      ).toLocaleDateString()}`
    );
    console.log("   - Provide refund for unused Starter period: 155,152 IDR");

    console.log("\n📋 OPTION 2: Proper Immediate Upgrade with Proration");
    console.log("   - Keep current dates (Professional active since Oct 9)");
    console.log("   - Provide refund for overcharge: 139,485 IDR");
    console.log("   - Document as prorated upgrade");

    console.log("\n📋 OPTION 3: Extend Professional Period");
    console.log("   - Keep Professional plan active");
    console.log("   - Keep current start date (Oct 9)");
    console.log(
      `   - Extend end date by unused Starter days to: ${new Date(
        subscription.currentPeriodEnd.getTime() + 32 * 24 * 60 * 60 * 1000
      ).toLocaleDateString()}`
    );
    console.log("   - No refund needed, but longer subscription period");

    // Ask user which option they prefer
    console.log("\n❓ WHICH OPTION DO YOU PREFER?");
    console.log("   Type the option number (1, 2, or 3) to apply the fix");

    return {
      option1: {
        action: "Adjust to honor end-of-period upgrade",
        newStartDate: starterShouldEndDate,
        newEndDate: addOneMonth(starterShouldEndDate),
        refundAmount: 155152,
      },
      option2: {
        action: "Keep current dates, provide overcharge refund",
        refundAmount: 139485,
      },
      option3: {
        action: "Extend subscription period",
        newEndDate: new Date(
          subscription.currentPeriodEnd.getTime() + 32 * 24 * 60 * 60 * 1000
        ),
        refundAmount: 0,
      },
    };
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function applyFix(optionNumber) {
  try {
    const tenantId = "cmghev0c50001yi3lj42ckskc";

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
    });

    if (!subscription) {
      console.log("❌ No subscription found");
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { tenantId },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const starterTransaction = transactions.find(
      (tx) => tx.subscriptionPlan?.name === "Starter" && tx.status === "PAID"
    );

    const starterStartDate = new Date(starterTransaction.createdAt);
    const starterShouldEndDate = addOneMonth(starterStartDate);

    switch (optionNumber) {
      case 1:
        // Option 1: Honor end-of-period upgrade
        const newStartDate = starterShouldEndDate;
        const newEndDate = addOneMonth(newStartDate);

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: newStartDate,
            currentPeriodEnd: newEndDate,
            updatedAt: new Date(),
          },
        });

        // Create a refund transaction record
        await prisma.transaction.create({
          data: {
            userId: starterTransaction.userId,
            tenantId: tenantId,
            subscriptionPlanId: starterTransaction.subscriptionPlanId,
            amount: -155152, // Negative amount for refund
            currency: "IDR",
            billingCycle: "MONTHLY",
            status: "REFUND_PENDING",
            paymentMethod: "SYSTEM_ADJUSTMENT",
            metadata: {
              type: "unused_period_refund",
              originalTransactionId: starterTransaction.id,
              reason: "Unused Starter plan period due to immediate upgrade",
              refundDays: 32,
              dailyRate: 4848.48,
            },
          },
        });

        console.log(
          "✅ Applied Option 1: Adjusted dates and created refund record"
        );
        break;

      case 2:
        // Option 2: Keep dates, provide overcharge refund
        await prisma.transaction.create({
          data: {
            userId: starterTransaction.userId,
            tenantId: tenantId,
            subscriptionPlanId: subscription.planId,
            amount: -139485, // Negative amount for refund
            currency: "IDR",
            billingCycle: "MONTHLY",
            status: "REFUND_PENDING",
            paymentMethod: "SYSTEM_ADJUSTMENT",
            metadata: {
              type: "overcharge_refund",
              reason:
                "Overcharged for immediate upgrade without proper proration",
              correctChargeAmount: 95515,
              actualChargedAmount: 235000,
              overchargeAmount: 139485,
            },
          },
        });

        console.log("✅ Applied Option 2: Created overcharge refund record");
        break;

      case 3:
        // Option 3: Extend subscription period
        const extendedEndDate = new Date(
          subscription.currentPeriodEnd.getTime() + 32 * 24 * 60 * 60 * 1000
        );

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodEnd: extendedEndDate,
            updatedAt: new Date(),
          },
        });

        // Create a credit transaction record
        await prisma.transaction.create({
          data: {
            userId: starterTransaction.userId,
            tenantId: tenantId,
            subscriptionPlanId: subscription.planId,
            amount: 0, // No monetary transaction
            currency: "IDR",
            billingCycle: "MONTHLY",
            status: "COMPLETED",
            paymentMethod: "SYSTEM_ADJUSTMENT",
            metadata: {
              type: "period_extension",
              reason:
                "Extended subscription period to account for unused Starter plan",
              extensionDays: 32,
              newEndDate: extendedEndDate.toISOString(),
            },
          },
        });

        console.log("✅ Applied Option 3: Extended subscription period");
        break;

      default:
        console.log("❌ Invalid option number");
    }
  } catch (error) {
    console.error("Error applying fix:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions for use in other scripts
module.exports = {
  fixSubscriptionDates,
  applyFix,
};

// If run directly, show the options
if (require.main === module) {
  fixSubscriptionDates();
}
