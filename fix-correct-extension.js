const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixToCorrectExtension() {
  try {
    const tenantId = 'cmghev0c50001yi3lj42ckskc';
    
    console.log('🔧 FIXING TO CORRECT EXTENSION');
    console.log('==============================');

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true }
    });

    if (!subscription) {
      console.log('❌ No subscription found');
      return;
    }

    console.log('\n📋 CURRENT STATE:');
    console.log(`Current End Date: ${subscription.currentPeriodEnd.toLocaleDateString()}`);

    // Calculate correct extension
    const unusedStarterValue = 154839; // IDR
    const professionalDailyRate = 235000 / 30; // 7833.33 IDR/day
    const correctExtensionDays = Math.round(unusedStarterValue / professionalDailyRate);
    
    // Calculate correct end date
    const originalEndDate = new Date('2025-11-09T02:03:22.796Z');
    const correctEndDate = new Date(originalEndDate);
    correctEndDate.setDate(correctEndDate.getDate() + correctExtensionDays);

    console.log('\n🎯 CORRECT CALCULATION:');
    console.log(`Unused Starter Value: ${unusedStarterValue.toLocaleString()} IDR`);
    console.log(`Professional Daily Rate: ${professionalDailyRate.toFixed(2)} IDR/day`);
    console.log(`Correct Extension: ${correctExtensionDays} days`);
    console.log(`Correct End Date: ${correctEndDate.toLocaleDateString()}`);

    // Update to correct date
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodEnd: correctEndDate,
        updatedAt: new Date()
      }
    });

    // Get user for transaction record
    const user = await prisma.user.findFirst({
      where: { tenantId }
    });

    // Create corrected transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        tenantId: tenantId,
        subscriptionPlanId: subscription.planId,
        amount: 0,
        currency: 'IDR',
        billingCycle: 'MONTHLY',
        status: 'PAID',
        paymentMethod: 'SYSTEM_ADJUSTMENT',
        metadata: {
          type: 'subscription_extension_correction',
          reason: 'Corrected extension calculation for upgrade billing overlap',
          originalExtensionDays: 32,
          correctedExtensionDays: correctExtensionDays,
          unusedStarterValue: unusedStarterValue,
          professionalDailyRate: professionalDailyRate,
          calculation: {
            unusedStarterValue: unusedStarterValue,
            professionalDailyRate: professionalDailyRate,
            extensionDays: correctExtensionDays
          },
          originalEndDate: originalEndDate.toISOString(),
          correctedEndDate: correctEndDate.toISOString()
        }
      }
    });

    console.log('\n✅ CORRECTION APPLIED:');
    console.log(`Previous End Date: ${subscription.currentPeriodEnd.toLocaleDateString()}`);
    console.log(`Corrected End Date: ${correctEndDate.toLocaleDateString()}`);
    console.log(`Extension: ${correctExtensionDays} days`);
    console.log(`Value: ${unusedStarterValue.toLocaleString()} IDR worth of service`);

    // Show the difference
    const previousExtensionDays = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const overExtension = previousExtensionDays - correctExtensionDays;
    const overValue = overExtension * professionalDailyRate;

    console.log('\n📊 CORRECTION SUMMARY:');
    console.log(`Previous Extension: ${previousExtensionDays} days`);
    console.log(`Correct Extension: ${correctExtensionDays} days`);
    console.log(`Over-extension Removed: ${overExtension} days`);
    console.log(`Over-value Removed: ${overValue.toFixed(2)} IDR`);

    return {
      correctedEndDate: correctEndDate,
      extensionDays: correctExtensionDays,
      overExtensionRemoved: overExtension
    };

  } catch (error) {
    console.error('Error fixing extension:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the correction
if (require.main === module) {
  fixToCorrectExtension()
    .then(() => {
      console.log('\n🎉 Extension corrected successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to correct extension:', error);
      process.exit(1);
    });
}

module.exports = { fixToCorrectExtension };
