import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/admin/role-permissions - Get role-permission assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    let whereClause = {};
    if (roleId) {
      whereClause = { roleId };
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: whereClause,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            tenantId: true,
          },
        },
        permission: {
          select: {
            id: true,
            name: true,
            description: true,
            resource: true,
            action: true,
          },
        },
      },
      orderBy: [
        { role: { name: 'asc' } },
        { permission: { resource: 'asc' } },
        { permission: { action: 'asc' } },
      ],
    });

    // Filter by tenant if not platform admin
    const filteredRolePermissions = session.user.role === 'PLATFORM_ADMIN' 
      ? rolePermissions
      : rolePermissions.filter(rp => 
          rp.role.tenantId === session.user.tenantId || rp.role.tenantId === null
        );

    return NextResponse.json(filteredRolePermissions);
  } catch (error) {
    console.error('Role permissions fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/role-permissions - Assign permissions to a role
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
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roleId, permissionIds } = body;

    // Validate required fields
    if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'Role ID and permission IDs array are required' },
        { status: 400 }
      );
    }

    // Verify role exists and belongs to tenant (or is platform-wide)
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { tenantId: session.user.tenantId },
          { tenantId: null }, // Platform-wide roles
        ],
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Verify permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
    });

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json(
        { error: 'One or more permissions not found' },
        { status: 404 }
      );
    }

    // Remove existing role-permission assignments for this role
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new role-permission assignments
    const rolePermissions = await Promise.all(
      permissionIds.map((permissionId: string) =>
        prisma.rolePermission.create({
          data: {
            roleId,
            permissionId,
          },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
                resource: true,
                action: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json(rolePermissions, { status: 201 });
  } catch (error) {
    console.error('Role permission assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/role-permissions - Remove permission from role
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');
    const permissionId = searchParams.get('permissionId');

    if (!roleId || !permissionId) {
      return NextResponse.json(
        { error: 'Role ID and permission ID are required' },
        { status: 400 }
      );
    }

    // Verify role belongs to tenant
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { tenantId: session.user.tenantId },
          { tenantId: null }, // Platform-wide roles
        ],
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Delete the role-permission assignment
    const deleted = await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Role-permission assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Permission removed from role successfully' });
  } catch (error) {
    console.error('Role permission removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}