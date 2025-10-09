const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function calculateRefundForUser() {
  try {
    const tenantId = 'cmghev0c50001yi3lj42ckskc';
    
    // Get the subscription and recent transactions
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true }
    });

    const transactions = await prisma.transaction.findMany({
      where: { tenantId },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (!subscription || transactions.length < 2) {
      console.log('❌ Insufficient data for refund calculation');
      return;
    }

    // Find the two relevant transactions
    const professionalTransaction = transactions.find(tx => 
      tx.subscriptionPlan?.name === 'Professional' && tx.status === 'PAID'
    );
    const starterTransaction = transactions.find(tx => 
      tx.subscriptionPlan?.name === 'Starter' && tx.status === 'PAID'
    );

    if (!professionalTransaction || !starterTransaction) {
      console.log('❌ Could not find both Starter and Professional transactions');
      return;
    }

    console.log('📊 REFUND CALCULATION ANALYSIS');
    console.log('=====================================');

    // Original Starter Plan Details
    const starterStartDate = new Date(starterTransaction.createdAt);
    const starterEndDate = new Date('2025-11-09T03:12:33.420Z'); // Should have been the end date
    const starterPrice = Number(starterTransaction.amount);

    console.log('\n🟦 STARTER PLAN (Original):');
    console.log(`   Payment Date: ${starterStartDate.toLocaleDateString()}`);
    console.log(`   Should End: ${starterEndDate.toLocaleDateString()}`);
    console.log(`   Amount Paid: ${starterPrice.toLocaleString()} IDR`);

    // Professional Plan Details  
    const professionalStartDate = new Date(professionalTransaction.createdAt);
    const professionalEndDate = new Date(subscription.currentPeriodEnd);
    const professionalPrice = Number(professionalTransaction.amount);

    console.log('\n🟩 PROFESSIONAL PLAN (Upgrade):');
    console.log(`   Payment Date: ${professionalStartDate.toLocaleDateString()}`);
    console.log(`   Actual End: ${professionalEndDate.toLocaleDateString()}`);
    console.log(`   Amount Paid: ${professionalPrice.toLocaleString()} IDR`);

    // Calculate overlapping period
    const overlapStartDate = professionalStartDate;
    const overlapEndDate = starterEndDate;
    
    console.log('\n⚠️  OVERLAP ANALYSIS:');
    console.log(`   Overlap Start: ${overlapStartDate.toLocaleDateString()}`);
    console.log(`   Overlap End: ${overlapEndDate.toLocaleDateString()}`);

    // Calculate days
    const totalStarterDays = Math.ceil((starterEndDate.getTime() - starterStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const usedStarterDays = Math.ceil((overlapStartDate.getTime() - starterStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const unusedStarterDays = Math.ceil((overlapEndDate.getTime() - overlapStartDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log('\n📅 TIME ANALYSIS:');
    console.log(`   Total Starter Days: ${totalStarterDays} days`);
    console.log(`   Used Starter Days: ${usedStarterDays} days`);
    console.log(`   Unused Starter Days: ${unusedStarterDays} days`);

    // Calculate refund amounts
    const dailyStarterRate = starterPrice / totalStarterDays;
    const unusedStarterValue = dailyStarterRate * unusedStarterDays;

    console.log('\n💰 REFUND CALCULATION:');
    console.log(`   Daily Starter Rate: ${dailyStarterRate.toFixed(2)} IDR/day`);
    console.log(`   Unused Starter Value: ${unusedStarterValue.toFixed(2)} IDR`);

    // What should have happened vs what actually happened
    const totalPaidAmount = starterPrice + professionalPrice;
    const professionalDailyRate = professionalPrice / 30; // Assuming 30 days for professional
    const correctProfessionalCharge = professionalDailyRate * 30; // Full month
    const correctTotalAmount = starterPrice + correctProfessionalCharge - unusedStarterValue;

    console.log('\n🔍 WHAT SHOULD HAVE HAPPENED:');
    console.log(`   Keep Starter until: ${starterEndDate.toLocaleDateString()}`);
    console.log(`   Start Professional: ${starterEndDate.toLocaleDateString()}`);
    console.log(`   No overlap, no double payment`);

    console.log('\n💸 FINANCIAL IMPACT:');
    console.log(`   Total Actually Paid: ${totalPaidAmount.toLocaleString()} IDR`);
    console.log(`   Should Have Paid: ${(starterPrice + professionalPrice).toLocaleString()} IDR (but at different times)`);
    console.log(`   Refund Due (Unused Starter): ${Math.round(unusedStarterValue).toLocaleString()} IDR`);

    // Alternative calculation: If they wanted immediate upgrade with proper proration
    const totalProfessionalDays = Math.ceil((professionalEndDate.getTime() - professionalStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const proratedProfessionalForRemainingPeriod = (professionalPrice / 30) * unusedStarterDays;
    const correctImmediateUpgradeCharge = proratedProfessionalForRemainingPeriod - unusedStarterValue;

    console.log('\n🔄 ALTERNATIVE: PROPER IMMEDIATE UPGRADE:');
    console.log(`   Unused Starter Credit: ${Math.round(unusedStarterValue).toLocaleString()} IDR`);
    console.log(`   Prorated Professional (${unusedStarterDays} days): ${Math.round(proratedProfessionalForRemainingPeriod).toLocaleString()} IDR`);
    console.log(`   Net Additional Charge: ${Math.round(correctImmediateUpgradeCharge).toLocaleString()} IDR`);
    console.log(`   Actual Charged: ${professionalPrice.toLocaleString()} IDR`);
    console.log(`   Overcharged by: ${Math.round(professionalPrice - correctImmediateUpgradeCharge).toLocaleString()} IDR`);

    console.log('\n🎯 RECOMMENDED ACTIONS:');
    console.log(`   1. Refund unused Starter period: ${Math.round(unusedStarterValue).toLocaleString()} IDR`);
    console.log(`   2. OR adjust Professional billing to start from ${starterEndDate.toLocaleDateString()}`);
    console.log(`   3. OR provide credit for future billing: ${Math.round(unusedStarterValue).toLocaleString()} IDR`);

    return {
      refundAmount: Math.round(unusedStarterValue),
      overchargedAmount: Math.round(professionalPrice - correctImmediateUpgradeCharge),
      unusedDays: unusedStarterDays,
      totalOverlap: totalPaidAmount
    };

  } catch (error) {
    console.error('Error calculating refund:', error);
  } finally {
    await prisma.$disconnect();
  }
}

calculateRefundForUser();
