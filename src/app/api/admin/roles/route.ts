import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/admin/roles - Get all roles for the tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (!['PLATFORM_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const roles = await prisma.role.findMany({
      where: {
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Roles fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Create a new custom role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (!['PLATFORM_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, permissionIds } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Check if role name already exists in this tenant
    const existingRole = await prisma.role.findFirst({
      where: {
        name: name.trim(),
        tenantId: session.user.tenantId,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 409 }
      );
    }

    // Validate permission IDs if provided
    let validPermissionIds: string[] = [];
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      const existingPermissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
        },
        select: { id: true },
      });
      validPermissionIds = existingPermissions.map((p: { id: string }) => p.id);
    }

    // Create role and permission assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create role
      const role = await tx.role.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isSystem: false, // Custom roles are not system roles
          tenantId: session.user.tenantId!,
        },
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true,
          createdAt: true,
        },
      });

      // Assign permissions if provided
      if (validPermissionIds.length > 0) {
        await Promise.all(
          validPermissionIds.map((permissionId: string) =>
            tx.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId,
              },
            })
          )
        );
      }

      return role;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Role creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}