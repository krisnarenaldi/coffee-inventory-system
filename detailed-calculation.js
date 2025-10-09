const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showDetailedCalculation() {
  try {
    console.log('🧮 DETAILED CALCULATION BREAKDOWN');
    console.log('==================================');

    // Your actual transaction data
    const starterPaymentDate = new Date('2025-10-08T03:11:50.203Z');
    const professionalPaymentDate = new Date('2025-10-09T02:02:51.478Z');
    const starterAmount = 160000; // IDR
    const professionalAmount = 235000; // IDR

    console.log('\n📅 TIMELINE:');
    console.log(`Starter Plan Payment: ${starterPaymentDate.toLocaleDateString()} at ${starterPaymentDate.toLocaleTimeString()}`);
    console.log(`Professional Plan Payment: ${professionalPaymentDate.toLocaleDateString()} at ${professionalPaymentDate.toLocaleTimeString()}`);

    // Calculate the Starter plan period
    const starterStartDate = starterPaymentDate;
    const starterShouldEndDate = new Date(starterStartDate);
    starterShouldEndDate.setMonth(starterShouldEndDate.getMonth() + 1); // Add 1 month

    console.log('\n📋 STARTER PLAN DETAILS:');
    console.log(`Start Date: ${starterStartDate.toLocaleDateString()}`);
    console.log(`Should End Date: ${starterShouldEndDate.toLocaleDateString()}`);
    console.log(`Amount Paid: ${starterAmount.toLocaleString()} IDR`);

    // Calculate total days in Starter period
    const totalStarterDays = Math.ceil(
      (starterShouldEndDate.getTime() - starterStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate used days (from start until Professional upgrade)
    const usedStarterDays = Math.ceil(
      (professionalPaymentDate.getTime() - starterStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate unused days
    const unusedStarterDays = totalStarterDays - usedStarterDays;

    console.log('\n⏰ TIME CALCULATION:');
    console.log(`Total Starter Days: ${totalStarterDays} days`);
    console.log(`Used Starter Days: ${usedStarterDays} days`);
    console.log(`Unused Starter Days: ${unusedStarterDays} days`);

    // Calculate daily rate
    const dailyStarterRate = starterAmount / totalStarterDays;

    console.log('\n💰 RATE CALCULATION:');
    console.log(`Daily Starter Rate: ${starterAmount} ÷ ${totalStarterDays} = ${dailyStarterRate.toFixed(2)} IDR/day`);

    // Calculate unused value
    const unusedStarterValue = dailyStarterRate * unusedStarterDays;

    console.log('\n🎯 FINAL CALCULATION:');
    console.log(`Unused Value = Daily Rate × Unused Days`);
    console.log(`Unused Value = ${dailyStarterRate.toFixed(2)} × ${unusedStarterDays}`);
    console.log(`Unused Value = ${unusedStarterValue.toFixed(2)} IDR`);
    console.log(`Rounded = ${Math.round(unusedStarterValue).toLocaleString()} IDR`);

    // Verification with exact dates
    console.log('\n🔍 VERIFICATION:');
    console.log(`Oct 8 to Oct 9 = ${usedStarterDays} day used`);
    console.log(`Oct 9 to Nov 8 = ${unusedStarterDays} days unused`);
    console.log(`${unusedStarterDays} days out of ${totalStarterDays} total days = ${((unusedStarterDays/totalStarterDays)*100).toFixed(1)}% unused`);
    console.log(`${((unusedStarterDays/totalStarterDays)*100).toFixed(1)}% of ${starterAmount.toLocaleString()} IDR = ${Math.round(unusedStarterValue).toLocaleString()} IDR`);

    // Show the math another way
    console.log('\n🧮 ALTERNATIVE CALCULATION METHOD:');
    console.log(`Percentage unused = ${unusedStarterDays}/${totalStarterDays} = ${(unusedStarterDays/totalStarterDays).toFixed(4)}`);
    console.log(`Unused amount = ${starterAmount.toLocaleString()} × ${(unusedStarterDays/totalStarterDays).toFixed(4)} = ${Math.round(starterAmount * (unusedStarterDays/totalStarterDays)).toLocaleString()} IDR`);

    return {
      totalStarterDays,
      usedStarterDays,
      unusedStarterDays,
      dailyStarterRate,
      unusedStarterValue: Math.round(unusedStarterValue)
    };

  } catch (error) {
    console.error('Error in calculation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showDetailedCalculation();
