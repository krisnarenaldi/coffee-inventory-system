# Implementation Guide: Proper Subscription Upgrade Logic

## Summary of Issues Found

### 1. **Current Problem**
- System doesn't properly handle "upgrade at end of current period" option
- Always starts new billing period immediately upon payment
- No proration logic for immediate upgrades
- Results in double billing for overlapping periods

### 2. **Your Specific Case**
- **Starter Plan**: Paid 160,000 IDR on Oct 8, should run until Nov 9
- **Professional Plan**: Paid 235,000 IDR on Oct 9, started immediately
- **Result**: You paid 395,000 IDR for overlapping service
- **Refund Due**: 155,152 IDR (unused Starter period)

## Required Code Changes

### 1. Update Subscription Frontend (subscription/page.tsx)

Add upgrade timing option to the UI:

```tsx
// Add to the upgrade modal
const [upgradeOption, setUpgradeOption] = useState('immediate');

// In the upgrade modal JSX:
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    When should the upgrade take effect?
  </label>
  <div className="space-y-2">
    <label className="flex items-center">
      <input
        type="radio"
        value="immediate"
        checked={upgradeOption === 'immediate'}
        onChange={(e) => setUpgradeOption(e.target.value)}
        className="mr-2"
      />
      <span>Immediately (with proration)</span>
    </label>
    <label className="flex items-center">
      <input
        type="radio"
        value="end_of_period"
        checked={upgradeOption === 'end_of_period'}
        onChange={(e) => setUpgradeOption(e.target.value)}
        className="mr-2"
      />
      <span>At end of current billing period</span>
    </label>
  </div>
</div>

// Update the upgrade API call:
body: JSON.stringify({ 
  planId: selectedPlan, 
  upgradeOption: upgradeOption 
})
```

### 2. Update Upgrade API (api/subscription/upgrade/route.ts)

```tsx
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { planId, upgradeOption = 'immediate' } = await request.json();
    
    // ... existing validation code ...

    if (isUpgrade) {
      // Store upgrade option in transaction metadata
      await prisma.subscription.update({
        where: { tenantId: session.user.tenantId },
        data: {
          status: 'PENDING_CHECKOUT' as any,
          intendedPlan: newPlan.id,
          updatedAt: new Date(),
        },
      });

      const cycle = (newPlan.interval || 'MONTHLY').toString().toLowerCase();
      const checkoutUrl = `/checkout?plan=${newPlan.id}&cycle=${cycle}&upgrade_option=${upgradeOption}`;

      return NextResponse.json({
        message: 'Upgrade requires payment. Redirecting to checkout.',
        checkoutUrl,
        requiresPayment: true,
        upgradeOption
      });
    }
  } catch (error) {
    // ... error handling ...
  }
}
```

### 3. Update Checkout Token Creation (api/checkout/create-token/route.ts)

```tsx
// Add upgrade option to transaction metadata
const transaction = await prisma.transaction.create({
  data: {
    paymentGatewayId: orderId,
    userId: user.id,
    tenantId: user.tenantId,
    subscriptionPlanId: planId,
    amount: price,
    currency: 'IDR',
    billingCycle,
    status: 'PENDING',
    paymentMethod: 'MIDTRANS',
    metadata: {
      upgradeOption: searchParams.get('upgrade_option') || 'immediate',
      originalRequest: 'subscription_upgrade'
    },
    createdAt: new Date(),
  },
});
```

### 4. Update Payment Webhook (api/webhooks/midtrans/route.ts)

Replace the current `handleSuccessfulPayment` function:

```tsx
async function handleSuccessfulPayment(transaction: any, notification: any) {
  try {
    const upgradeOption = transaction.metadata?.upgradeOption || 'immediate';
    const existingSubscription = await prisma.subscription.findFirst({
      where: { tenantId: transaction.tenantId },
      include: { plan: true }
    });

    if (!existingSubscription) {
      // New subscription - use immediate activation
      const startDate = new Date();
      const interval = transaction.subscriptionPlan?.interval || 'MONTHLY';
      const endDate = computeNextPeriodEnd(startDate, interval);
      
      await prisma.subscription.create({
        data: {
          tenantId: transaction.tenantId,
          planId: transaction.subscriptionPlanId,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
        },
      });
      return;
    }

    // Handle upgrade based on option
    if (upgradeOption === 'end_of_period') {
      // Schedule upgrade for end of current period
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          intendedPlan: transaction.subscriptionPlanId,
          updatedAt: new Date()
        }
      });

      // Mark transaction as scheduled
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SCHEDULED',
          metadata: {
            ...transaction.metadata,
            scheduledActivationDate: existingSubscription.currentPeriodEnd.toISOString(),
            upgradeType: 'end_of_period'
          }
        }
      });

      console.log(`Upgrade scheduled for ${existingSubscription.currentPeriodEnd}`);
      
    } else {
      // Immediate upgrade - activate now
      const startDate = new Date();
      const interval = transaction.subscriptionPlan?.interval || 'MONTHLY';
      const endDate = computeNextPeriodEnd(startDate, interval);

      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: transaction.subscriptionPlanId,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: 'ACTIVE',
          intendedPlan: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        }
      });

      // Calculate and record proration details
      const totalDaysInCurrentPeriod = Math.ceil(
        (existingSubscription.currentPeriodEnd.getTime() - existingSubscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const remainingDays = Math.ceil(
        (existingSubscription.currentPeriodEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const currentPlanPrice = Number(existingSubscription.plan.price);
      const newPlanPrice = Number(transaction.subscriptionPlan.price);
      const unusedAmount = (currentPlanPrice / totalDaysInCurrentPeriod) * remainingDays;
      const newPlanProrated = (newPlanPrice / totalDaysInCurrentPeriod) * remainingDays;
      const proratedAmount = newPlanProrated - unusedAmount;

      // Update transaction with proration details
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...transaction.metadata,
            proration: {
              totalDaysInCurrentPeriod,
              remainingDays,
              currentPlanPrice,
              newPlanPrice,
              unusedAmount,
              newPlanProrated,
              proratedAmount,
              actualCharged: Number(transaction.amount)
            }
          }
        }
      });

      console.log('Immediate upgrade activated with proration details');
    }

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}
```

### 5. Create Scheduled Upgrade Processor

Create a new file `lib/scheduled-upgrade-processor.ts`:

```tsx
import { PrismaClient } from '@prisma/client';
import { computeNextPeriodEnd } from './subscription-periods';

const prisma = new PrismaClient();

export async function processScheduledUpgrades() {
  try {
    const now = new Date();
    
    const subscriptionsWithScheduledUpgrades = await prisma.subscription.findMany({
      where: {
        intendedPlan: { not: null },
        currentPeriodEnd: { lte: now }
      },
      include: { plan: true }
    });

    for (const subscription of subscriptionsWithScheduledUpgrades) {
      const newPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: subscription.intendedPlan }
      });

      if (!newPlan) continue;

      const startDate = subscription.currentPeriodEnd;
      const endDate = computeNextPeriodEnd(startDate, newPlan.interval);

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: subscription.intendedPlan,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: 'ACTIVE',
          intendedPlan: null,
          updatedAt: new Date()
        }
      });

      // Update scheduled transactions
      await prisma.transaction.updateMany({
        where: {
          tenantId: subscription.tenantId,
          subscriptionPlanId: subscription.intendedPlan,
          status: 'SCHEDULED'
        },
        data: {
          status: 'PAID',
          updatedAt: new Date()
        }
      });

      console.log(`Activated scheduled upgrade for tenant ${subscription.tenantId}`);
    }

    return subscriptionsWithScheduledUpgrades.length;
  } catch (error) {
    console.error('Error processing scheduled upgrades:', error);
    throw error;
  }
}
```

### 6. Add Cron Job for Scheduled Upgrades

Create `pages/api/cron/process-scheduled-upgrades.ts`:

```tsx
import { NextApiRequest, NextApiResponse } from 'next';
import { processScheduledUpgrades } from '../../../lib/scheduled-upgrade-processor';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret (add to your env vars)
  const cronSecret = req.headers.authorization?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const processedCount = await processScheduledUpgrades();
    res.status(200).json({ 
      success: true, 
      processedUpgrades: processedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Next Steps

1. **Implement the code changes above**
2. **Choose your preferred fix option** (run the fix script with option 1, 2, or 3)
3. **Set up the cron job** to run daily for processing scheduled upgrades
4. **Test the new upgrade flow** with a test account

## Your Immediate Options

Based on the analysis, here are your three options:

1. **Option 1**: Honor "end of period" - Adjust dates, get 155,152 IDR refund
2. **Option 2**: Keep current dates - Get 139,485 IDR refund for overcharge  
3. **Option 3**: Extend subscription - No refund, but 32 extra days of service

Which option would you prefer? I can help you apply the fix once you decide.
