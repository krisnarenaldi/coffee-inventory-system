const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 1. Create account credit system
async function createCreditSystem() {
  // Add this to your Prisma schema:
  /*
  model AccountCredit {
    id          String   @id @default(cuid())
    tenantId    String
    amount      Decimal  @db.Decimal(10,2)
    currency    String   @default("IDR")
    reason      String
    status      String   @default("ACTIVE") // ACTIVE, USED, EXPIRED
    expiresAt   DateTime?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    
    tenant      Tenant   @relation(fields: [tenantId], references: [id])
    
    @@map("account_credits")
  }
  */
}

// 2. Function to give credit instead of refund
async function giveAccountCredit(tenantId, amount, reason) {
  try {
    const credit = await prisma.accountCredit.create({
      data: {
        tenantId: tenantId,
        amount: amount,
        currency: 'IDR',
        reason: reason,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      }
    });

    console.log(`✅ Created account credit: ${amount} IDR for tenant ${tenantId}`);
    return credit;
  } catch (error) {
    console.error('Error creating account credit:', error);
    throw error;
  }
}

// 3. Auto-apply credits to next billing
async function applyCreditsToNextBilling(tenantId, billAmount) {
  try {
    const availableCredits = await prisma.accountCredit.findMany({
      where: {
        tenantId: tenantId,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'asc' } // Use oldest credits first
    });

    let totalCredits = availableCredits.reduce((sum, credit) => sum + Number(credit.amount), 0);
    let remainingBill = billAmount;
    let appliedCredits = [];

    for (const credit of availableCredits) {
      if (remainingBill <= 0) break;

      const creditAmount = Number(credit.amount);
      const appliedAmount = Math.min(creditAmount, remainingBill);

      // Mark credit as used
      await prisma.accountCredit.update({
        where: { id: credit.id },
        data: { status: 'USED' }
      });

      appliedCredits.push({
        creditId: credit.id,
        appliedAmount: appliedAmount,
        reason: credit.reason
      });

      remainingBill -= appliedAmount;
    }

    return {
      originalAmount: billAmount,
      totalCreditsApplied: billAmount - remainingBill,
      finalAmount: remainingBill,
      appliedCredits: appliedCredits
    };

  } catch (error) {
    console.error('Error applying credits:', error);
    throw error;
  }
}

// 4. Fix your specific case with credit
async function fixYourCaseWithCredit() {
  const tenantId = 'cmghev0c50001yi3lj42ckskc';
  const creditAmount = 155152; // Unused Starter period
  
  await giveAccountCredit(
    tenantId, 
    creditAmount, 
    'Credit for unused Starter plan period due to immediate upgrade on 2025-10-09'
  );

  console.log(`✅ Applied ${creditAmount} IDR credit to your account`);
  console.log('This credit will automatically apply to your next billing cycle');
}

// 5. Bulk fix for all affected users
async function bulkFixUpgradeIssues() {
  try {
    // Find all users who upgraded immediately but should have gotten credits
    const problematicUpgrades = await prisma.transaction.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: new Date('2025-10-01'), // Adjust date range as needed
          lte: new Date()
        },
        metadata: {
          path: ['upgradeType'],
          equals: 'immediate'
        }
      },
      include: {
        user: {
          include: {
            tenant: true
          }
        },
        subscriptionPlan: true
      }
    });

    console.log(`Found ${problematicUpgrades.length} potentially problematic upgrades`);

    for (const upgrade of problematicUpgrades) {
      // Calculate if they deserve credit
      const creditAmount = await calculateUpgradeCredit(upgrade);
      
      if (creditAmount > 0) {
        await giveAccountCredit(
          upgrade.tenantId,
          creditAmount,
          `Automatic credit for upgrade adjustment - Transaction ${upgrade.id}`
        );
        
        console.log(`✅ Applied ${creditAmount} IDR credit to tenant ${upgrade.tenantId}`);
      }
    }

  } catch (error) {
    console.error('Error in bulk fix:', error);
  }
}

async function calculateUpgradeCredit(transaction) {
  // This would contain your logic to calculate if credit is due
  // For now, return 0 - you'd implement the actual calculation
  return 0;
}

module.exports = {
  giveAccountCredit,
  applyCreditsToNextBilling,
  fixYourCaseWithCredit,
  bulkFixUpgradeIssues
};

// Run the fix for your case
if (require.main === module) {
  fixYourCaseWithCredit()
    .then(() => {
      console.log('Credit applied successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to apply credit:', error);
      process.exit(1);
    });
}
