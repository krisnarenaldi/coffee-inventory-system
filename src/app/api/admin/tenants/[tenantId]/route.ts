import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

// GET /api/admin/tenants/[tenantId] - Get tenant details (Platform Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: resolvedParams.tenantId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            lastLogin: true,
            emailVerified: true
          },
          orderBy: { createdAt: 'desc' }
        },
        settings: true,
        _count: {
          select: {
            users: true,
            ingredients: true,
            batches: true,
            suppliers: true,
            recipes: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get usage statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentBatches, recentUsers, storageUsage] = await Promise.all([
      prisma.batch.count({
        where: {
          tenantId: resolvedParams.tenantId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      prisma.user.count({
        where: {
          tenantId: resolvedParams.tenantId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      // Simulate storage usage calculation
      prisma.batch.aggregate({
        where: {
          tenantId: resolvedParams.tenantId
        },
        _sum: {
          actualYield: true
        }
      })
    ]);

    const usage = {
      recentBatches,
      recentUsers,
      estimatedStorageGB: Math.round(Number(storageUsage._sum.actualYield || 0) / 1000), // Rough estimate
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      tenant,
      usage
    });
  } catch (error) {
    console.error('Error fetching tenant details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tenants/[id] - Update tenant (Platform Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, name, domain, notes } = body;
    const resolvedParams = await params;

    // Validate tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: resolvedParams.tenantId }
    });

    if (!existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status && !['ACTIVE', 'SUSPENDED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE, SUSPENDED, or CANCELLED' },
        { status: 400 }
      );
    }

    // Check if domain is already taken (if provided and different from current)
    if (domain && domain !== existingTenant.domain) {
      const existingDomain = await prisma.tenant.findFirst({
        where: { 
          domain,
          id: { not: resolvedParams.tenantId }
        }
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (domain !== undefined) updateData.domain = domain || null;
    if (notes !== undefined) updateData.notes = notes;

    // Update tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: resolvedParams.tenantId },
      data: updateData,
      include: {
        subscription: {
          include: {
            plan: true
          }
        },
        _count: {
          select: {
            users: true,
            ingredients: true,
            batches: true
          }
        }
      }
    });

    // Log the change for audit purposes (if audit log model exists)
    // Note: Audit logging would be implemented when audit model is available

    return NextResponse.json({
      message: 'Tenant updated successfully',
      tenant: updatedTenant
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tenants/[id] - Delete tenant (Platform Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: resolvedParams.tenantId },
      include: {
        _count: {
          select: {
            users: true,
            batches: true,
            ingredients: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of tenants with data (safety measure)
    if (tenant._count.users > 0 || tenant._count.batches > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tenant with existing users or batches. Please migrate or remove data first.' },
        { status: 400 }
      );
    }

    // Delete tenant and related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete tenant settings
      await tx.tenantSetting.deleteMany({
        where: { tenantId: params.tenantId }
      });

      // Delete subscription
      await tx.subscription.deleteMany({
        where: { tenantId: params.tenantId }
      });

      // Delete audit logs (if audit log model exists)
      // Note: Audit log cleanup would be implemented when audit model is available

      // Finally delete the tenant
      await tx.tenant.delete({
        where: { id: params.tenantId }
      });
    });

    return NextResponse.json({
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}