import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

// POST /api/cron/auto-downgrade-expired - Downgrade tenants whose grace period has passed
// Protected by INTERNAL_DOWNGRADE_TOKEN; intended for cron execution
export async function POST(request: NextRequest) {
  try {
    const internalToken = request.headers.get('X-Internal-Access');
    const expectedToken = process.env.INTERNAL_DOWNGRADE_TOKEN;
    if (!expectedToken || internalToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const graceDeadline = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find subscriptions that ended more than 7 days ago and are not Free plan
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        currentPeriodEnd: { lt: graceDeadline },
        status: { not: 'PENDING_CHECKOUT' as any },
        plan: { name: { not: 'Free' } },
      },
      select: { tenantId: true },
    });

    if (!expiredSubs.length) {
      return NextResponse.json({ processed: 0, message: 'No subscriptions past grace period' });
    }

    // Build internal URL to call downgrade endpoint
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const downgradeUrl = `${proto}://${host}/api/subscription/revert-to-free`;

    let processed = 0;
    const failures: string[] = [];

    for (const sub of expiredSubs) {
      try {
        const res = await fetch(downgradeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Access': expectedToken,
          },
          body: JSON.stringify({ tenantId: sub.tenantId }),
        });
        if (!res.ok) {
          failures.push(sub.tenantId);
          continue;
        }
        processed++;
      } catch (e) {
        failures.push(sub.tenantId);
      }
    }

    return NextResponse.json({ processed, failures });
  } catch (error) {
    console.error('Auto-downgrade cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}