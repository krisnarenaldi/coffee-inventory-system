import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { createSnapToken, generateOrderId, formatPriceForMidtrans } from '../../../../../lib/midtrans';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, paymentMethod = 'midtrans' } = await request.json();

    // Get user and tenant information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    });

    if (!user || !user.tenant) {
      return NextResponse.json({ error: 'User or tenant not found' }, { status: 404 });
    }

    // Get the subscription to renew
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Verify the subscription belongs to the user's tenant
    if (subscription.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized access to subscription' }, { status: 403 });
    }

    // Check if subscription is eligible for renewal (expired or expiring soon)
    const now = new Date();
    const daysUntilExpiry = Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry > 7) {
      return NextResponse.json({ 
        error: 'Subscription can only be renewed within 7 days of expiry',
        daysUntilExpiry 
      }, { status: 400 });
    }

    // Calculate renewal period
    const renewalStartDate = subscription.currentPeriodEnd;
    const renewalEndDate = new Date(renewalStartDate);
    
    if (subscription.plan.interval === 'YEARLY') {
      renewalEndDate.setFullYear(renewalEndDate.getFullYear() + 1);
    } else {
      renewalEndDate.setMonth(renewalEndDate.getMonth() + 1);
    }

    // Generate order ID for the renewal
    const orderId = generateOrderId('RENEWAL');
    const amount = Number(subscription.plan.price);
    const formattedAmount = formatPriceForMidtrans(amount);

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        subscriptionPlanId: subscription.plan.id,
        amount: subscription.plan.price,
        currency: 'IDR',
        billingCycle: subscription.plan.interval,
        status: 'PENDING',
        paymentMethod: paymentMethod,
        paymentGatewayId: orderId,
        metadata: {
          type: 'renewal',
          originalSubscriptionId: subscription.id,
          renewalPeriodStart: renewalStartDate.toISOString(),
          renewalPeriodEnd: renewalEndDate.toISOString(),
          created_at: new Date().toISOString()
        }
      }
    });

    // Create Midtrans Snap token
    const snapToken = await createSnapToken({
      transaction_details: {
        order_id: orderId,
        gross_amount: formattedAmount
      },
      customer_details: {
        first_name: user.name?.split(' ')[0] || 'Customer',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email
      },
      item_details: [
        {
          id: subscription.plan.id,
          price: formattedAmount,
          quantity: 1,
          name: `${subscription.plan.name} Plan Renewal`,
          category: 'subscription_renewal'
        }
      ],
      callbacks: {
        finish: `${process.env.NEXTAUTH_URL}/subscription/renewal-success?order_id=${orderId}`,
        error: `${process.env.NEXTAUTH_URL}/subscription/renewal-error?order_id=${orderId}`,
        pending: `${process.env.NEXTAUTH_URL}/subscription/renewal-pending?order_id=${orderId}`
      },
      expiry: {
        start_time: new Date().toISOString().replace(/\.\d{3}Z$/, ' +0700'),
        unit: 'day',
        duration: 1
      },
      custom_field1: 'subscription_renewal',
      custom_field2: subscription.id,
      custom_field3: user.tenantId
    });

    return NextResponse.json({
      snapToken,
      orderId,
      amount: formattedAmount,
      planName: subscription.plan.name,
      billingCycle: subscription.plan.interval,
      renewalPeriod: {
        start: renewalStartDate,
        end: renewalEndDate
      },
      transactionId: transaction.id
    });

  } catch (error) {
    console.error('Subscription renewal error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription renewal' },
      { status: 500 }
    );
  }
}

// Get renewal eligibility and information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });
    }

    // Get user and tenant information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    });

    if (!user || !user.tenant) {
      return NextResponse.json({ error: 'User or tenant not found' }, { status: 404 });
    }

    // Get the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Verify the subscription belongs to the user's tenant
    if (subscription.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized access to subscription' }, { status: 403 });
    }

    // Calculate renewal information
    const now = new Date();
    const daysUntilExpiry = Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isEligibleForRenewal = daysUntilExpiry <= 7;
    
    const renewalStartDate = subscription.currentPeriodEnd;
    const renewalEndDate = new Date(renewalStartDate);
    
    if (subscription.plan.interval === 'YEARLY') {
      renewalEndDate.setFullYear(renewalEndDate.getFullYear() + 1);
    } else {
      renewalEndDate.setMonth(renewalEndDate.getMonth() + 1);
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        planName: subscription.plan.name,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
        price: Number(subscription.plan.price),
        interval: subscription.plan.interval
      },
      renewal: {
        eligible: isEligibleForRenewal,
        daysUntilExpiry,
        renewalPeriod: {
          start: renewalStartDate,
          end: renewalEndDate
        },
        amount: Number(subscription.plan.price)
      }
    });

  } catch (error) {
    console.error('Get renewal info error:', error);
    return NextResponse.json(
      { error: 'Failed to get renewal information' },
      { status: 500 }
    );
  }
}