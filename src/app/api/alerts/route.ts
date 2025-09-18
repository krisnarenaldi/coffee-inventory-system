import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';

const alertCreateSchema = z.object({
  type: z.enum(['LOW_STOCK', 'EXPIRATION', 'REORDER', 'BATCH_READY', 'MAINTENANCE', 'SYSTEM']),
  title: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

const alertUpdateSchema = z.object({
  isRead: z.boolean().optional(),
  isResolved: z.boolean().optional(),
});

// GET /api/alerts - Fetch alerts for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const isRead = searchParams.get('isRead');
    const isResolved = searchParams.get('isResolved');
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (isRead !== null) where.isRead = isRead === 'true';
    if (isResolved !== null) where.isResolved = isResolved === 'true';

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          resolvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create a new alert
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = alertCreateSchema.parse(body);

    const alert = await prisma.alert.create({
      data: {
        tenantId: session.user.tenantId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        severity: validatedData.severity || 'MEDIUM',
      },
      include: {
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}