const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Automatically extend subscription periods instead of refunding
async function autoExtendForUpgradeIssues() {
  try {
    const tenantId = "cmghev0c50001yi3lj42ckskc";

    // Get current subscription and user
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    });

    const user = await prisma.user.findFirst({
      where: { tenantId },
    });

    if (!subscription) {
      console.log("❌ No subscription found");
      return;
    }

    // Calculate extension days (32 days from unused Starter period)
    const extensionDays = 32;
    const currentEndDate = new Date(subscription.currentPeriodEnd);
    const newEndDate = new Date(
      currentEndDate.getTime() + extensionDays * 24 * 60 * 60 * 1000
    );

    // Extend the subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodEnd: newEndDate,
        updatedAt: new Date(),
      },
    });

    // Create a record of the extension
    await prisma.transaction.create({
      data: {
        userId: user.id,
        tenantId: tenantId,
        subscriptionPlanId: subscription.planId,
        amount: 0,
        currency: "IDR",
        billingCycle: "MONTHLY",
        status: "PAID",
        paymentMethod: "SYSTEM_ADJUSTMENT",
        metadata: {
          type: "subscription_extension",
          reason: "Compensation for upgrade billing overlap",
          extensionDays: extensionDays,
          originalEndDate: currentEndDate.toISOString(),
          newEndDate: newEndDate.toISOString(),
          equivalentValue: 155152, // IDR value of the extension
        },
      },
    });

    console.log("✅ SUBSCRIPTION EXTENDED");
    console.log(`   Original End Date: ${currentEndDate.toLocaleDateString()}`);
    console.log(`   New End Date: ${newEndDate.toLocaleDateString()}`);
    console.log(`   Extension: ${extensionDays} days`);
    console.log(`   Value: 155,152 IDR worth of service`);

    return {
      originalEndDate: currentEndDate,
      newEndDate: newEndDate,
      extensionDays: extensionDays,
      valueInIDR: 155152,
    };
  } catch (error) {
    console.error("Error extending subscription:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Bulk extension for all affected users
async function bulkExtendAffectedUsers() {
  try {
    // Find all subscriptions that might need extension
    const affectedSubscriptions = await prisma.subscription.findMany({
      where: {
        // Add criteria to find affected subscriptions
        updatedAt: {
          gte: new Date("2025-10-01"), // Adjust as needed
        },
      },
      include: {
        plan: true,
      },
    });

    console.log(
      `Found ${affectedSubscriptions.length} potentially affected subscriptions`
    );

    for (const subscription of affectedSubscriptions) {
      // Calculate if extension is needed
      const extensionNeeded = await calculateExtensionNeeded(subscription);

      if (extensionNeeded.days > 0) {
        const currentEndDate = new Date(subscription.currentPeriodEnd);
        const newEndDate = new Date(
          currentEndDate.getTime() + extensionNeeded.days * 24 * 60 * 60 * 1000
        );

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodEnd: newEndDate,
            updatedAt: new Date(),
          },
        });

        console.log(
          `✅ Extended subscription for tenant ${subscription.tenantId} by ${extensionNeeded.days} days`
        );
      }
    }
  } catch (error) {
    console.error("Error in bulk extension:", error);
  }
}

async function calculateExtensionNeeded(subscription) {
  // Implement logic to determine if extension is needed
  // For now, return 0 days
  return { days: 0, reason: "No extension needed" };
}

module.exports = {
  autoExtendForUpgradeIssues,
  bulkExtendAffectedUsers,
};

// Run the extension for your case
if (require.main === module) {
  autoExtendForUpgradeIssues();
}
