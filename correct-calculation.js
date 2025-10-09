const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showCorrectCalculation() {
  try {
    console.log('🔍 CORRECT CALCULATION ANALYSIS');
    console.log('================================');

    // Actual data from your case
    const starterAmount = 160000; // IDR
    const professionalAmount = 235000; // IDR
    const starterStartDate = new Date('2025-10-08T03:11:50.203Z');
    const professionalStartDate = new Date('2025-10-09T02:02:51.478Z');
    const currentPeriodEnd = new Date('2025-11-09T02:03:22.796Z');

    console.log('\n📊 GIVEN DATA:');
    console.log(`Starter Amount: ${starterAmount.toLocaleString()} IDR`);
    console.log(`Professional Amount: ${professionalAmount.toLocaleString()} IDR`);
    console.log(`Starter Start: ${starterStartDate.toLocaleDateString()}`);
    console.log(`Professional Start: ${professionalStartDate.toLocaleDateString()}`);
    console.log(`Current Period End: ${currentPeriodEnd.toLocaleDateString()}`);

    // Method 1: Calculate unused Starter value
    console.log('\n🧮 METHOD 1: UNUSED STARTER VALUE');
    const totalStarterDays = 31; // Oct 8 to Nov 8
    const usedStarterDays = 1;   // Oct 8 to Oct 9
    const unusedStarterDays = 30; // Oct 9 to Nov 8
    
    const dailyStarterRate = starterAmount / totalStarterDays;
    const unusedStarterValue = dailyStarterRate * unusedStarterDays;
    
    console.log(`Total Starter Days: ${totalStarterDays}`);
    console.log(`Used Starter Days: ${usedStarterDays}`);
    console.log(`Unused Starter Days: ${unusedStarterDays}`);
    console.log(`Daily Starter Rate: ${starterAmount} ÷ ${totalStarterDays} = ${dailyStarterRate.toFixed(2)} IDR/day`);
    console.log(`Unused Starter Value: ${dailyStarterRate.toFixed(2)} × ${unusedStarterDays} = ${unusedStarterValue.toFixed(2)} IDR`);

    // Method 2: Convert unused value to Professional days
    console.log('\n🔄 METHOD 2: CONVERT TO PROFESSIONAL DAYS');
    const professionalPeriodDays = 30; // Assuming 30 days for monthly
    const dailyProfessionalRate = professionalAmount / professionalPeriodDays;
    const extensionDaysFromCredit = unusedStarterValue / dailyProfessionalRate;
    
    console.log(`Professional Period: ${professionalPeriodDays} days`);
    console.log(`Daily Professional Rate: ${professionalAmount} ÷ ${professionalPeriodDays} = ${dailyProfessionalRate.toFixed(2)} IDR/day`);
    console.log(`Extension Days: ${unusedStarterValue.toFixed(2)} ÷ ${dailyProfessionalRate.toFixed(2)} = ${extensionDaysFromCredit.toFixed(1)} days`);

    // Your calculation
    console.log('\n✅ YOUR CALCULATION:');
    console.log(`235,000 ÷ 30 = ${(235000/30).toFixed(2)} IDR/day`);
    console.log(`154,839 ÷ ${(235000/30).toFixed(2)} = ${(154839/(235000/30)).toFixed(1)} days`);
    
    const yourExtensionDays = Math.round(154839 / (235000/30));
    const yourNewEndDate = new Date(currentPeriodEnd);
    yourNewEndDate.setDate(yourNewEndDate.getDate() + yourExtensionDays);
    
    console.log(`Extension: ${yourExtensionDays} days`);
    console.log(`New End Date: ${currentPeriodEnd.toLocaleDateString()} + ${yourExtensionDays} days = ${yourNewEndDate.toLocaleDateString()}`);

    // What I actually did (wrong)
    console.log('\n❌ WHAT I DID (INCORRECT):');
    const myWrongExtension = 32;
    const myWrongEndDate = new Date(currentPeriodEnd);
    myWrongEndDate.setDate(myWrongEndDate.getDate() + myWrongExtension);
    console.log(`I extended by: ${myWrongExtension} days`);
    console.log(`My end date: ${myWrongEndDate.toLocaleDateString()}`);
    console.log(`My extension value: ${(myWrongExtension * (235000/30)).toFixed(2)} IDR`);

    // Comparison
    console.log('\n⚖️  COMPARISON:');
    console.log(`Correct Extension: ${yourExtensionDays} days (${yourNewEndDate.toLocaleDateString()})`);
    console.log(`My Extension: ${myWrongExtension} days (${myWrongEndDate.toLocaleDateString()})`);
    console.log(`Difference: ${myWrongExtension - yourExtensionDays} extra days`);
    console.log(`Over-compensation: ${((myWrongExtension - yourExtensionDays) * (235000/30)).toFixed(2)} IDR`);

    return {
      correctExtensionDays: yourExtensionDays,
      correctEndDate: yourNewEndDate,
      myWrongExtensionDays: myWrongExtension,
      overCompensation: (myWrongExtension - yourExtensionDays) * (235000/30)
    };

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showCorrectCalculation();
