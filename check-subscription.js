const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkSubscription() {
  try {
    console.log("🔍 Checking coffee-central tenant subscription...");

    // Find the specific tenant by ID
    const tenant = await prisma.tenant.findUnique({
      where: { id: "cmghev0c50001yi3lj42ckskc" },
      select: { id: true, name: true, subdomain: true, status: true },
    });

    if (!tenant) {
      console.log("❌ No coffee-central tenant found");
      return;
    }

    console.log("✅ Tenant found:", tenant);

    // Check for subscription
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: tenant.id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            interval: true,
            isActive: true,
          },
        },
      },
    });

    if (!subscription) {
      console.log("❌ No subscription found for coffee-central tenant");

      // Check if there are any subscription plans available
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, price: true },
      });

      console.log("Available plans:", plans);
    } else {
      console.log("✅ Subscription found:", {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        plan: subscription.plan,
      });

      // Check if subscription is expired
      const now = new Date();
      const isExpired = subscription.currentPeriodEnd
        ? now > subscription.currentPeriodEnd
        : false;
      console.log("Is expired?", isExpired);
    }

    // Check recent transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        subscriptionPlan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    console.log("\nRecent transactions:");
    transactions.forEach((tx, index) => {
      console.log(`${index + 1}.`, {
        id: tx.id,
        paymentGatewayId: tx.paymentGatewayId,
        subscriptionPlanId: tx.subscriptionPlanId,
        planName: tx.subscriptionPlan?.name,
        amount: tx.amount.toString(),
        status: tx.status,
        paymentMethod: tx.paymentMethod,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      });
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubscription();
