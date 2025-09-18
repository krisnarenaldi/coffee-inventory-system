import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { activityLogger } from '../../../../../lib/activity-logger';
import { z } from 'zod';

// Validation schema for activity stats queries
const getActivityStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
});

// GET /api/activity-logs/stats - Get activity statistics for current tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to view activity stats
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      groupBy: searchParams.get('groupBy') || undefined
    };

    const validatedParams = getActivityStatsSchema.parse(queryParams);

    const options = {
      ...validatedParams,
      startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
      endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined
    };

    const stats = await activityLogger.getActivityStats(
      session.user.tenantId,
      options
    );

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error fetching activity stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}