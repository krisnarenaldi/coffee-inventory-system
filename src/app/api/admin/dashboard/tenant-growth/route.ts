import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

// GET /api/admin/dashboard/tenant-growth - Get tenant growth data
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

    // Get all tenants with their creation dates
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Generate daily growth data
    const growthData = [];
    let runningTotal = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Count tenants created on this date
      const newTenants = tenants.filter((tenant: { id: string; createdAt: Date }) => {
        const tenantDate = tenant.createdAt.toISOString().split('T')[0];
        return tenantDate === dateString;
      }).length;
      
      // Count total tenants up to this date
      const totalTenants = tenants.filter((tenant: { id: string; createdAt: Date }) => {
        return tenant.createdAt <= currentDate;
      }).length;
      
      growthData.push({
        date: dateString,
        newTenants,
        totalTenants
      });
    }

    return NextResponse.json(growthData);
  } catch (error) {
    console.error('Error fetching tenant growth data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}