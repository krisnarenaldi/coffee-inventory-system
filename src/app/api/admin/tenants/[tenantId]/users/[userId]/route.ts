import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '../../../../../../../../lib/prisma';
import { logResourceUpdated, logResourceDeleted } from '../../../../../../../../lib/activity-logger';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schema for user updates
const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'BREWMASTER', 'STAFF', 'SALES']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional()
});

// GET /api/admin/tenants/[tenantId]/users/[userId] - Get specific user details
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; userId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is platform admin
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { tenantId, userId } = params;

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true
          }
        },
        _count: {
          select: {
            batches: true,
            alerts: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tenants/[tenantId]/users/[userId] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantId: string; userId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is platform admin
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { tenantId, userId } = params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If email is being updated, check for conflicts
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: validatedData.email
          }
        }
      });

      if (emailConflict) {
        return NextResponse.json(
          { error: 'User with this email already exists in this tenant' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    // Update user
    const user = await prisma.user.update({
      where: {
        id: userId
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log activity
    await logResourceUpdated(
      tenantId,
      session.user.id,
      'user',
      user.id,
      user.name || user.email,
      validatedData
    );

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tenants/[tenantId]/users/[userId] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; userId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is platform admin
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { tenantId, userId } = params;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting the last admin user
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          tenantId,
          role: 'ADMIN',
          isActive: true
        }
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        );
      }
    }

    // Delete user
    await prisma.user.delete({
      where: {
        id: userId
      }
    });

    // Log activity
    await logResourceDeleted(
      tenantId,
      session.user.id,
      'user',
      userId,
      existingUser.name || existingUser.email
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}