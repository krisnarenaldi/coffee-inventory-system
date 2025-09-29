import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId: session.user.tenantId,
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ hasPendingCheckout: false });
    }

    // Check if user has pending checkout (PENDING_CHECKOUT status with intended plan)
    const hasPendingCheckout = 
      (subscription as any).status === 'PENDING_CHECKOUT' && 
      (subscription as any).intendedPlan && 
      (subscription as any).intendedPlan !== 'free';

    return NextResponse.json({
      hasPendingCheckout,
      intendedPlan: (subscription as any).intendedPlan,
    });

  } catch (error) {
    console.error('Error checking pending checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}