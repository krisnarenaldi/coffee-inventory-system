const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeSpecificCalculation() {
  try {
    console.log('🔍 ANALYZING SPECIFIC TENANT CALCULATION');
    console.log('========================================');

    const tenantId = 'cmgiv7jnr000ty9g744lyriec';

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true }
    });

    if (!subscription) {
      console.log('❌ No subscription found for tenant:', tenantId);
      return;
    }

    console.log('\n📊 CURRENT SUBSCRIPTION:');
    console.log(`Tenant ID: ${tenantId}`);
    console.log(`Current Plan: ${subscription.plan.name}`);
    console.log(`Current Price: ${subscription.plan.price.toLocaleString()} IDR`);
    console.log(`Period Start: ${subscription.currentPeriodStart.toLocaleDateString()}`);
    console.log(`Period End: ${subscription.currentPeriodEnd.toLocaleDateString()}`);
    console.log(`Status: ${subscription.status}`);

    // Get Professional plan
    const professionalPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: 'professional-plan' }
    });

    if (!professionalPlan) {
      console.log('❌ Professional plan not found');
      return;
    }

    console.log('\n🎯 TARGET PLAN:');
    console.log(`Plan: ${professionalPlan.name}`);
    console.log(`Price: ${professionalPlan.price.toLocaleString()} IDR`);

    // Calculate time periods
    const now = new Date();
    const currentPeriodStart = new Date(subscription.currentPeriodStart);
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);

    console.log('\n⏰ TIME ANALYSIS:');
    console.log(`Current Date: ${now.toLocaleDateString()}`);
    console.log(`Period Start: ${currentPeriodStart.toLocaleDateString()}`);
    console.log(`Period End: ${currentPeriodEnd.toLocaleDateString()}`);

    // Calculate total days in current period
    const totalCurrentDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate remaining days
    const remainingDays = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate used days
    const usedDays = totalCurrentDays - remainingDays;

    console.log(`Total Current Period Days: ${totalCurrentDays}`);
    console.log(`Used Days: ${usedDays}`);
    console.log(`Remaining Days: ${remainingDays}`);

    // Calculate daily rates
    const currentDailyRate = Number(subscription.plan.price) / totalCurrentDays;
    const newDailyRate = Number(professionalPlan.price) / 30; // Assuming 30 days for monthly

    console.log('\n💰 DAILY RATES:');
    console.log(`Current Plan Daily Rate: ${subscription.plan.price} ÷ ${totalCurrentDays} = ${currentDailyRate.toFixed(2)} IDR/day`);
    console.log(`Professional Daily Rate: ${professionalPlan.price} ÷ 30 = ${newDailyRate.toFixed(2)} IDR/day`);

    // Calculate unused current plan value
    const unusedCurrentValue = currentDailyRate * remainingDays;
    
    // Calculate new plan cost for remaining period
    const newPlanProratedCost = newDailyRate * remainingDays;
    
    // Calculate additional charge
    const additionalCharge = Math.max(0, newPlanProratedCost - unusedCurrentValue);

    console.log('\n🧮 CALCULATION BREAKDOWN:');
    console.log(`Unused Current Value = ${currentDailyRate.toFixed(2)} × ${remainingDays} = ${unusedCurrentValue.toFixed(2)} IDR`);
    console.log(`New Plan Prorated Cost = ${newDailyRate.toFixed(2)} × ${remainingDays} = ${newPlanProratedCost.toFixed(2)} IDR`);
    console.log(`Additional Charge = ${newPlanProratedCost.toFixed(2)} - ${unusedCurrentValue.toFixed(2)} = ${additionalCharge.toFixed(2)} IDR`);

    console.log('\n📋 EXPECTED UI VALUES:');
    console.log(`• Upgrade Now: Rp ${Math.round(additionalCharge).toLocaleString()}`);
    console.log(`• Unused ${subscription.plan.name} value: Rp ${Math.round(unusedCurrentValue).toLocaleString()}`);
    console.log(`• ${professionalPlan.name} cost for ${remainingDays} days: Rp ${Math.round(newPlanProratedCost).toLocaleString()}`);
    
    // Calculate next billing date (1 month from now)
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    console.log(`• Next billing: Rp ${professionalPlan.price.toLocaleString()} on ${nextBillingDate.toLocaleDateString()}`);

    console.log('\n🔍 COMPARISON WITH YOUR UI:');
    console.log('Your UI shows:');
    console.log('• Upgrade Now: Rp 82,833');
    console.log('• Unused Starter value: Rp 160,000');
    console.log('• Professional cost for 31 days: Rp 242,833');
    console.log('• Next billing: Rp 235000 on 11/8/2025');

    console.log('\nCalculated values:');
    console.log(`• Upgrade Now: Rp ${Math.round(additionalCharge).toLocaleString()}`);
    console.log(`• Unused ${subscription.plan.name} value: Rp ${Math.round(unusedCurrentValue).toLocaleString()}`);
    console.log(`• ${professionalPlan.name} cost for ${remainingDays} days: Rp ${Math.round(newPlanProratedCost).toLocaleString()}`);

    // Analyze the discrepancy
    console.log('\n🔍 ANALYSIS:');
    if (Math.round(unusedCurrentValue) === 160000) {
      console.log('✅ Unused value matches - using full plan price instead of prorated');
    } else {
      console.log('❌ Unused value discrepancy - check calculation method');
    }

    if (Math.round(newPlanProratedCost) === 242833) {
      console.log('✅ Professional cost matches');
    } else {
      console.log('❌ Professional cost discrepancy');
    }

    if (Math.round(additionalCharge) === 82833) {
      console.log('✅ Additional charge matches');
    } else {
      console.log('❌ Additional charge discrepancy');
    }

    // Check if using different calculation method
    console.log('\n🔄 ALTERNATIVE CALCULATION (Full Plan Price Method):');
    const altUnusedValue = Number(subscription.plan.price); // Full plan price
    const altAdditionalCharge = newPlanProratedCost - altUnusedValue;
    console.log(`If using full plan price as unused value:`);
    console.log(`• Unused value: ${altUnusedValue.toLocaleString()} IDR`);
    console.log(`• Additional charge: ${newPlanProratedCost.toFixed(2)} - ${altUnusedValue} = ${altAdditionalCharge.toFixed(2)} IDR`);

    return {
      subscription,
      professionalPlan,
      calculation: {
        totalCurrentDays,
        remainingDays,
        currentDailyRate,
        newDailyRate,
        unusedCurrentValue,
        newPlanProratedCost,
        additionalCharge
      }
    };

  } catch (error) {
    console.error('❌ Error analyzing calculation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeSpecificCalculation()
    .then(() => {
      console.log('\n🎉 Analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeSpecificCalculation };
