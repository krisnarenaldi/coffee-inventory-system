import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = params;
    const body = await request.json();
    const { isActive, role, roleIds } = body;

    // Verify the user exists and belongs to the same tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent users from deactivating themselves
    if (id === session.user.id && isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    if (role && typeof role === 'string') {
      const validRoles = ['STAFF', 'WAREHOUSE_STAFF', 'SALES', 'BREWMASTER', 'MANAGER'];
      if (session.user.role === 'ADMIN') {
        validRoles.push('ADMIN');
      }
      
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      
      updateData.role = role;
    }

    // Update user and handle role assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      });

      // Handle role assignments if provided
      if (roleIds && Array.isArray(roleIds)) {
        // Remove existing role assignments
        await tx.userRoleAssignment.deleteMany({
          where: { userId: id },
        });

        // Validate new role IDs
        if (roleIds.length > 0) {
          const existingRoles = await tx.role.findMany({
            where: {
              id: { in: roleIds },
              tenantId: session.user.tenantId,
            },
            select: { id: true },
          });

          const validRoleIds = existingRoles.map((r: { id: string }) => r.id);

          // Create new role assignments
          if (validRoleIds.length > 0) {
            await Promise.all(
              validRoleIds.map((roleId: string) =>
                tx.userRoleAssignment.create({
                  data: {
                    userId: id,
                    roleId,
                    assignedBy: session.user.id,
                  },
                })
              )
            );
          }
        }
      }

      return updatedUser;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (soft delete by deactivating)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verify the user exists and belongs to the same tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent users from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Soft delete by deactivating the user
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: 'User deactivated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}