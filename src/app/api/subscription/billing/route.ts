import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/subscription/billing - Get billing history and invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can view billing information
    if (!['ADMIN', 'PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get current subscription for billing context
    const subscription = await prisma.subscription.findUnique({
      where: {
        tenantId: session.user.tenantId
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            interval: true
          }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // In a real implementation, this would fetch from Stripe or your payment processor
    // For demo purposes, we'll generate mock billing history
    const mockBillingHistory = generateMockBillingHistory(
      subscription,
      limit,
      offset
    );

    const billingInfo = {
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      },
      invoices: mockBillingHistory.invoices,
      paymentMethods: mockBillingHistory.paymentMethods,
      upcomingInvoice: mockBillingHistory.upcomingInvoice,
      totalPages: Math.ceil(mockBillingHistory.totalCount / limit),
      currentPage: Math.floor(offset / limit) + 1,
      totalCount: mockBillingHistory.totalCount
    };

    return NextResponse.json(billingInfo);
  } catch (error) {
    console.error('Error fetching billing information:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate mock billing history
function generateMockBillingHistory(subscription: any, limit: number, offset: number) {
  const now = new Date();
  const totalCount = 12; // Mock 12 months of history
  
  const invoices = [];
  for (let i = offset; i < Math.min(offset + limit, totalCount); i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setMonth(invoiceDate.getMonth() - i);
    
    invoices.push({
      id: `inv_${subscription.id}_${i}`,
      number: `INV-${String(invoiceDate.getFullYear())}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      status: i === 0 ? 'pending' : 'paid',
      amount: subscription.plan.price,
      currency: 'IDR',
      date: invoiceDate.toISOString(),
      dueDate: new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      paidDate: i === 0 ? null : invoiceDate.toISOString(),
      description: `${subscription.plan.name} - ${subscription.plan.interval.toLowerCase()} subscription`,
      downloadUrl: `/api/subscription/billing/invoice/${subscription.id}_${i}`,
      lineItems: [
        {
          description: `${subscription.plan.name} Plan`,
          quantity: 1,
          unitPrice: subscription.plan.price,
          amount: subscription.plan.price
        }
      ]
    });
  }

  // Mock upcoming invoice
  const nextBillingDate = new Date(subscription.currentPeriodEnd);
  const upcomingInvoice = {
    id: `upcoming_${subscription.id}`,
    amount: subscription.plan.price,
    currency: 'IDR',
    date: nextBillingDate.toISOString(),
    description: `${subscription.plan.name} - ${subscription.plan.interval.toLowerCase()} subscription`,
    lineItems: [
      {
        description: `${subscription.plan.name} Plan`,
        quantity: 1,
        unitPrice: subscription.plan.price,
        amount: subscription.plan.price
      }
    ]
  };

  // Mock payment methods
  const paymentMethods = [
    {
      id: 'pm_mock_card',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025
      },
      isDefault: true
    }
  ];

  return {
    invoices,
    upcomingInvoice: subscription.cancelAtPeriodEnd ? null : upcomingInvoice,
    paymentMethods,
    totalCount
  };
}