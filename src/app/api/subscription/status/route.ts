import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { validateSubscription, getSubscriptionMessage } from '../../../../../lib/subscription-validation';

// GET /api/subscription/status - Get status for the current logged-in user's tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: session.user.tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({
        isExpired: false,
        isInGracePeriod: false,
        message: 'No subscription found. You are on the free plan.',
      });
    }

    const status = validateSubscription(subscription);
    const message = getSubscriptionMessage(subscription);

    return NextResponse.json({
      isExpired: status.isExpired,
      isInGracePeriod: status.isInGracePeriod,
      message,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/subscription/status - Check status by email and tenant subdomain (used during signin flow)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email as string | undefined;
    const tenantSubdomain = body?.tenantSubdomain as string | undefined;

    if (!email || !tenantSubdomain) {
      return NextResponse.json(
        { error: 'email and tenantSubdomain are required' },
        { status: 400 }
      );
    }

    // Resolve tenant by subdomain
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain: tenantSubdomain },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Optional: ensure the email exists within the tenant's users, but do not leak info
    // We'll perform a soft check but avoid failing to prevent enumeration issues
    await prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
      select: { id: true },
    }).catch(() => null);

    // Get subscription for the tenant
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: tenant.id },
      include: { plan: true },
    });

    if (!subscription) {
      // No subscription means they are effectively on free; not expired
      return NextResponse.json({ isExpired: false, isInGracePeriod: false });
    }

    const status = validateSubscription(subscription);
    return NextResponse.json({
      isExpired: status.isExpired,
      isInGracePeriod: status.isInGracePeriod,
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
