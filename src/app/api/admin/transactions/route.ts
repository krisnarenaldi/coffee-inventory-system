import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/admin/transactions - List transactions (Platform Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const q = searchParams.get('q');
    const tenantId = searchParams.get('tenantId');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (q) {
      // Search by payment gateway id, user email/name, tenant name/subdomain
      where.OR = [
        { paymentGatewayId: { contains: q } },
        { user: { OR: [{ email: { contains: q } }, { name: { contains: q } }] } },
        { tenant: { OR: [{ name: { contains: q } }, { subdomain: { contains: q } }] } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true, subdomain: true } },
          subscriptionPlan: { select: { id: true, name: true, interval: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    // Convert Decimal fields to numbers for frontend
    const transactions = items.map((t) => ({
      ...t,
      amount: Number(t.amount),
      subscriptionPlan: t.subscriptionPlan
        ? { ...t.subscriptionPlan, price: Number(t.subscriptionPlan.price) }
        : t.subscriptionPlan,
    }));

    return NextResponse.json({
      page,
      limit,
      total,
      items: transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}