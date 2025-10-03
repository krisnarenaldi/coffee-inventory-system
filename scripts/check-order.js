const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error('Usage: node scripts/check-order.js <orderId>');
    process.exit(1);
  }

  console.log('🔎 Checking transaction for orderId:', orderId);
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { paymentGatewayId: orderId },
        { id: orderId }
      ]
    },
    include: {
      tenant: { select: { id: true, name: true, subdomain: true } },
      subscriptionPlan: { select: { id: true, name: true, interval: true } }
    }
  });

  if (!tx) {
    console.log('❌ No transaction found for orderId');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Transaction found:', {
    id: tx.id,
    paymentGatewayId: tx.paymentGatewayId,
    status: tx.status,
    amount: tx.amount?.toString?.() || tx.amount,
    billingCycle: tx.billingCycle,
    tenantId: tx.tenantId,
    tenant: tx.tenant,
    subscriptionPlanId: tx.subscriptionPlanId,
    plan: tx.subscriptionPlan
  });
  console.log('🧾 Metadata keys:', tx.metadata ? Object.keys(tx.metadata) : []);

  if (tx.tenantId) {
    const sub = await prisma.subscription.findUnique({
      where: { tenantId: tx.tenantId },
      include: { plan: true }
    });
    if (!sub) {
      console.log('❌ No subscription found for tenant:', tx.tenantId);
    } else {
      console.log('📋 Subscription:', {
        id: sub.id,
        tenantId: sub.tenantId,
        status: sub.status,
        planId: sub.planId,
        plan: sub.plan,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd
      });
    }

    const recentTx = await prisma.transaction.findMany({
      where: { tenantId: tx.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('🧾 Recent tenant transactions:', recentTx.map(t => ({
      id: t.id,
      paymentGatewayId: t.paymentGatewayId,
      status: t.status,
      createdAt: t.createdAt
    })));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  try { await prisma.$disconnect(); } catch (_) {}
  process.exit(1);
});