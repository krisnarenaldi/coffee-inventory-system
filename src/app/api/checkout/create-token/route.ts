import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { createSnapToken, generateOrderId, formatPriceForMidtrans, MidtransParameter } from '../../../../../lib/midtrans';

// Midtrans expects 'yyyy-MM-dd HH:mm:ss Z' (eg '2020-06-09 15:07:00 +0700')
function formatMidtransStartTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const HH = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  // Use UTC offset explicitly
  const offset = '+0000';
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss} ${offset}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, billingCycle } = await request.json();

    if (!planId || !billingCycle) {
      return NextResponse.json({ error: 'Plan ID and billing cycle are required' }, { status: 400 });
    }

    // Get the subscription plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate price based on billing cycle
    const isYearly = billingCycle === 'yearly';
    const price = isYearly && plan.interval === 'YEARLY' ? plan.price : 
                  !isYearly && plan.interval === 'MONTHLY' ? plan.price : null;
    
    if (!price) {
      return NextResponse.json({ error: 'Price not available for selected billing cycle' }, { status: 400 });
    }

    // Generate unique order ID
    const orderId = generateOrderId('SUB');

    // Create transaction record in database
    const transaction = await prisma.transaction.create({
      data: {
        id: orderId,
        userId: user.id,
        tenantId: user.tenantId,
        subscriptionPlanId: planId,
        amount: price,
        currency: 'IDR',
        billingCycle,
        status: 'PENDING',
        paymentMethod: 'MIDTRANS',
        createdAt: new Date(),
      },
    });

    // Determine origin (current subdomain) for callbacks, fallback to NEXTAUTH_URL
    const origin = request.nextUrl.origin || process.env.NEXTAUTH_URL || '';

    // Prepare Midtrans parameters
    const midtransParams: MidtransParameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: formatPriceForMidtrans(Number(price)),
      },
      customer_details: {
        first_name: user.name?.split(' ')[0] || 'Customer',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
      },
      item_details: [
        {
          id: planId,
          price: formatPriceForMidtrans(Number(price)),
          quantity: 1,
          name: `${plan.name} - ${isYearly ? 'Yearly' : 'Monthly'} Subscription`,
          category: 'subscription',
        },
      ],
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${origin}/checkout/success?order_id=${orderId}`,
        error: `${origin}/checkout/error?order_id=${orderId}`,
        pending: `${origin}/checkout/pending?order_id=${orderId}`,
      },
      expiry: {
        start_time: formatMidtransStartTime(new Date()),
        unit: 'minute',
        duration: 30,
      },
      custom_field1: user.tenantId,
      custom_field2: planId,
      custom_field3: billingCycle,
    };

    // Create Snap token
    const snapToken = await createSnapToken(midtransParams);

    return NextResponse.json({
      snapToken,
      orderId,
      amount: Number(price),
      planName: plan.name,
      billingCycle,
    });

  } catch (error) {
    console.error('Error creating checkout token:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout token' },
      { status: 500 }
    );
  }
}