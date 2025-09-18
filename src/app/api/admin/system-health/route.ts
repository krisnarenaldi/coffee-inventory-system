import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { performHealthCheck, getRecentAlerts, resolveAlert, getHealthSummary } from '../../../../../lib/system-health';

// GET /api/admin/system-health - Get system health status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const limit = parseInt(searchParams.get('limit') || '50');

    switch (type) {
      case 'full':
        // Perform comprehensive health check
        const healthCheck = await performHealthCheck();
        return NextResponse.json(healthCheck);
        
      case 'alerts':
        // Get recent alerts
        const alerts = await getRecentAlerts(limit);
        return NextResponse.json({ alerts });
        
      case 'summary':
      default:
        // Get health summary for dashboard
        const summary = await getHealthSummary();
        return NextResponse.json(summary);
    }
  } catch (error) {
    console.error('Error fetching system health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/system-health - Resolve alerts or trigger health checks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, alertId } = body;

    switch (action) {
      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          );
        }
        
        const resolved = await resolveAlert(alertId);
        if (resolved) {
          return NextResponse.json({ 
            message: 'Alert resolved successfully',
            alertId 
          });
        } else {
          return NextResponse.json(
            { error: 'Failed to resolve alert' },
            { status: 500 }
          );
        }
        
      case 'trigger_health_check':
        const healthCheck = await performHealthCheck();
        return NextResponse.json({
          message: 'Health check completed',
          result: healthCheck
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing system health request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}