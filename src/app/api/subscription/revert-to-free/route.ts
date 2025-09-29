import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the free plan
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { name: 'Free' },
    });

    if (!freePlan) {
      return NextResponse.json(
        { error: 'Free plan not found' },
        { status: 404 }
      );
    }

    // Update subscription to free plan
    await prisma.subscription.update({
      where: { tenantId: session.user.tenantId },
      data: {
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodEnd: null as any, // Forever access for free plan
        intendedPlan: 'free',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reverting to free plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}