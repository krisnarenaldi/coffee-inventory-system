import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';

const createScheduleSchema = z.object({
  type: z.enum(['BREW_SESSION', 'MAINTENANCE', 'CLEANING', 'DELIVERY', 'MEETING', 'OTHER']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
});

const updateScheduleSchema = createScheduleSchema.partial().extend({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
});

// GET /api/schedules - Get schedules with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
          },
        },
        {
          description: {
            contains: search,
          },
        },
      ];
    }

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.startDate.lte = new Date(endDate);
      }
    }

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        orderBy: {
          startDate: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.schedule.count({ where }),
    ]);

    return NextResponse.json({
      schedules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createScheduleSchema.parse(body);

    // Convert startDate string to Date object
    const startDate = new Date(validatedData.startDate);
    const endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    
    // Validate that the start date is not in the past (unless it's for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    // Validate that end date is after start date
    if (endDate && endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.create({
      data: {
        ...validatedData,
        startDate,
        endDate,
        tenantId: session.user.tenantId,
      },
    });

    // Create an alert for upcoming schedules (24 hours before)
    const alertDate = new Date(startDate);
    alertDate.setHours(alertDate.getHours() - 24);
    
    if (alertDate > new Date()) {
      await prisma.alert.create({
        data: {
          tenantId: session.user.tenantId,
          scheduleId: schedule.id, // Link alert to the schedule
          type: 'SYSTEM',
          title: `Upcoming: ${validatedData.title}`,
          message: `Scheduled ${validatedData.type.toLowerCase().replace('_', ' ')} "${validatedData.title}" is due tomorrow at ${startDate.toLocaleString()}.`,
          severity: 'MEDIUM',
        },
      });
    }

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}