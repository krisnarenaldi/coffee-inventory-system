import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '../../../../../lib/prisma';
import { verifySignature, mapTransactionStatus } from '../../../../../lib/midtrans';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    
    // Parse the webhook payload
    const notification = JSON.parse(body);
    
    // Verify webhook signature
    const isValid = verifySignature(notification);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('Midtrans webhook received:', {
      order_id: notification.order_id,
      transaction_status: notification.transaction_status,
      payment_type: notification.payment_type,
      gross_amount: notification.gross_amount
    });

    // Extract order ID and find the transaction
    const orderId = notification.order_id;
    const transaction = await prisma.transaction.findFirst({
      where: { paymentGatewayId: orderId },
      include: {
        user: true,
        tenant: true,
        subscriptionPlan: true
      }
    });

    if (!transaction) {
      console.error('Transaction not found for order ID:', orderId);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Map Midtrans status to our transaction status
    const newStatus = mapTransactionStatus(notification.transaction_status);
    
    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        metadata: {
          ...transaction.metadata as any,
          midtrans_notification: notification,
          updated_at: new Date().toISOString()
        }
      }
    });

    // If payment is successful, update or create subscription
    if (newStatus === 'PAID') {
      await handleSuccessfulPayment(transaction, notification);
    } else if (newStatus === 'FAILED' || newStatus === 'CANCELLED') {
      await handleFailedPayment(transaction, notification);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(transaction: any, notification: any) {
  try {
    // Calculate subscription dates - 30 days from today
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Always 30 days as per requirement
    
    // Check if user has a subscription with PENDING_CHECKOUT status
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        tenantId: transaction.tenantId,
      }
    });

    if (existingSubscription) {
      // Update existing subscription - activate the intended plan
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: transaction.subscriptionPlanId,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: 'ACTIVE',
          intendedPlan: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: null, // Clear Stripe data since we're using Midtrans
          stripeSubscriptionId: null,
          updatedAt: new Date()
        } as any
      });
    } else {
      // Create new subscription (fallback case)
      await prisma.subscription.create({
        data: {
          tenantId: transaction.tenantId,
          planId: transaction.subscriptionPlanId,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: 'ACTIVE',
          intendedPlan: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any
      });
    }

    // Create usage tracking entries for the tenant
    const currentDate = new Date();
    const metrics = ['users', 'ingredients', 'products', 'batches', 'recipes'];
    
    for (const metric of metrics) {
      await prisma.usage.upsert({
        where: {
          tenantId_metric_date: {
            tenantId: transaction.tenantId,
            metric: metric,
            date: currentDate
          }
        },
        update: {
          value: 0
        },
        create: {
          tenantId: transaction.tenantId,
          metric: metric,
          value: 0,
          date: currentDate
        }
      });
    }

    console.log('Subscription activated successfully for tenant:', transaction.tenantId);
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

async function handleFailedPayment(transaction: any, notification: any) {
  try {
    console.log('Payment failed for transaction:', transaction.id);
    
    // You might want to send notification emails here
    // or perform other cleanup actions
    
    // For now, just log the failure
    console.log('Failed payment details:', {
      orderId: notification.order_id,
      transactionStatus: notification.transaction_status,
      userId: transaction.userId,
      tenantId: transaction.tenantId,
      amount: transaction.amount
    });
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}