import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { z } from 'zod';

const updateScheduleSchema = z.object({
  type: z.enum(['BREW_SESSION', 'MAINTENANCE', 'CLEANING', 'DELIVERY', 'MEETING', 'OTHER']).optional(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
});

// GET /api/schedules/[id] - Get a specific schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id] - Update a schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateScheduleSchema.parse(body);

    // Check if schedule exists and belongs to tenant
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.type) updateData.type = validatedData.type;
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.isRecurring !== undefined) updateData.isRecurring = validatedData.isRecurring;
    if (validatedData.recurrenceRule !== undefined) updateData.recurrenceRule = validatedData.recurrenceRule;
    
    if (validatedData.startDate) {
      const startDate = new Date(validatedData.startDate);
      
      // Validate that the start date is not in the past (unless it's for today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        return NextResponse.json(
          { error: 'Start date cannot be in the past' },
          { status: 400 }
        );
      }
      
      updateData.startDate = startDate;
    }
    
    if (validatedData.endDate) {
      const endDate = new Date(validatedData.endDate);
      const startDate = updateData.startDate || existingSchedule.startDate;
      
      // Validate that end date is after start date
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
      
      updateData.endDate = endDate;
    }

    const schedule = await prisma.schedule.update({
      where: {
        id: params.id,
      },
      data: updateData,
    });

    // If the schedule was completed, create a completion alert
    if (validatedData.status === 'COMPLETED' && existingSchedule.status !== 'COMPLETED') {
      await prisma.alert.create({
        data: {
          tenantId: session.user.tenantId,
          type: 'SYSTEM',
          title: `Schedule Completed: ${schedule.title}`,
          message: `The ${schedule.type.toLowerCase().replace('_', ' ')} "${schedule.title}" has been marked as completed.`,
          severity: 'LOW',
        },
      });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id] - Delete a schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if schedule exists and belongs to tenant
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Don't allow deletion of completed schedules for audit purposes
    if (existingSchedule.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot delete completed schedules' },
        { status: 400 }
      );
    }

    await prisma.schedule.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}