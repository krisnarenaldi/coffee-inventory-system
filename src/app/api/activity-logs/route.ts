import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { activityLogger, ActivityType, ActivitySeverity } from '../../../../lib/activity-logger';
import { z } from 'zod';

// Validation schema for activity log queries
const getActivityLogsSchema = z.object({
  userId: z.string().optional(),
  activityType: z.nativeEnum(ActivityType).optional(),
  severity: z.nativeEnum(ActivitySeverity).optional(),
  resourceType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

// GET /api/activity-logs - Get activity logs for current tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      userId: searchParams.get('userId') || undefined,
      activityType: searchParams.get('activityType') || undefined,
      severity: searchParams.get('severity') || undefined,
      resourceType: searchParams.get('resourceType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    };

    const validatedParams = getActivityLogsSchema.parse(queryParams);

    const options = {
      ...validatedParams,
      startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
      endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined
    };

    const { logs, total } = await activityLogger.getActivityLogs(
      session.user.tenantId,
      options
    );

    return NextResponse.json({
      success: true,
      data: logs,
      total,
      pagination: {
        limit: options.limit || 50,
        offset: options.offset || 0,
        hasMore: (options.offset || 0) + logs.length < total
      }
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

    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}