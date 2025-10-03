const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error('Usage: node scripts/reconcile-order.js <orderId>');
    process.exit(1);
  }

  console.log('🔧 Reconciling order:', orderId);
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { paymentGatewayId: orderId },
        { id: orderId }
      ]
    }
  });

  if (!tx) {
    console.log('❌ Transaction not found for orderId');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Transaction:', { id: tx.id, paymentGatewayId: tx.paymentGatewayId, status: tx.status, tenantId: tx.tenantId, subscriptionPlanId: tx.subscriptionPlanId });

  // Update transaction to PAID
  const updatedTx = await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: 'PAID',
      metadata: {
        ...(tx.metadata || {}),
        manual_reconciliation_at: new Date().toISOString()
      }
    }
  });
  console.log('🧾 Transaction updated:', { id: updatedTx.id, status: updatedTx.status });

  // Update subscription to ACTIVE with intended plan
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const sub = await prisma.subscription.findUnique({ where: { tenantId: tx.tenantId } });
  if (!sub) {
    console.log('ℹ️ No existing subscription. Creating new ACTIVE subscription.');
    const created = await prisma.subscription.create({
      data: {
        tenantId: tx.tenantId,
        planId: tx.subscriptionPlanId,
        status: 'ACTIVE',
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('📋 Subscription created:', { id: created.id, status: created.status, planId: created.planId });
  } else {
    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: tx.subscriptionPlanId,
        status: 'ACTIVE',
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        updatedAt: new Date()
      }
    });
    console.log('📋 Subscription updated:', { id: updatedSub.id, status: updatedSub.status, planId: updatedSub.planId, currentPeriodEnd: updatedSub.currentPeriodEnd });
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  try { await prisma.$disconnect(); } catch (_) {}
  process.exit(1);
});