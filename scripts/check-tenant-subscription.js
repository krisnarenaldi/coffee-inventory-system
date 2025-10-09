const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: node scripts/check-tenant-subscription.js <tenantId>');
    process.exit(1);
  }

  try {
    console.log('🔍 Checking subscription for tenant:', tenantId);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, subdomain: true, status: true },
    });

    console.log('Tenant:', tenant || 'Not found');

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      console.log('❌ No subscription record for this tenant');
    } else {
      const now = new Date();
      const isExpired = subscription.currentPeriodEnd
        ? now > new Date(subscription.currentPeriodEnd)
        : false;
      const isActiveStatus = ['ACTIVE', 'TRIALING', 'PENDING_CHECKOUT'].includes(subscription.status);
      console.log('Subscription:', {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.planId,
        planName: subscription.plan?.name,
        intendedPlan: subscription.intendedPlan,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        isExpired,
        isActiveStatus,
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    console.log('Recent Transactions:', transactions.map(t => ({
      id: t.id,
      status: t.status,
      amount: t.amount,
      subscriptionPlanId: t.subscriptionPlanId,
      createdAt: t.createdAt,
    })));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();