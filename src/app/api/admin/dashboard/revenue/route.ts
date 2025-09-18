import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

// GET /api/admin/dashboard/revenue - Get revenue data
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
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all subscriptions with their plans
    const subscriptions = await prisma.subscription.findMany({
      include: {
        plan: {
          select: {
            price: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Generate daily revenue data
    const revenueData = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Calculate active subscriptions on this date
      const activeSubscriptions = subscriptions.filter(sub => {
        const createdDate = sub.createdAt;
        const endDate = sub.currentPeriodEnd;
        
        return createdDate <= currentDate && 
               (!endDate || endDate >= currentDate) &&
               sub.status === 'ACTIVE';
      });
      
      // Calculate daily revenue (simplified - assumes monthly billing)
      const dailyRevenue = activeSubscriptions.reduce((total, sub) => {
        const price = sub.plan.price ? Number(sub.plan.price) : 0;
        return total + (price / 30); // Daily portion of monthly subscription
      }, 0);
      
      revenueData.push({
        date: dateString,
        revenue: Math.round(dailyRevenue * 100) / 100, // Round to 2 decimal places
        subscriptions: activeSubscriptions.length
      });
    }

    return NextResponse.json(revenueData);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}