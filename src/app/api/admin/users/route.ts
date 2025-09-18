import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { checkUserLimit } from '../../../../../lib/subscription-limits';

// GET /api/admin/users - Get all users in the tenant
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

    const users = await prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user
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
    const { name, email, password, role, roleIds } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate role
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

    // Check if email already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        tenantId: session.user.tenantId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists in this brewery' },
        { status: 409 }
      );
    }

    // Check subscription user limit
    const userLimitCheck = await checkUserLimit(session.user.tenantId!);
    if (!userLimitCheck.allowed) {
      return NextResponse.json(
        { error: userLimitCheck.message || 'User limit exceeded' },
        { status: 403 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Validate role IDs if provided
    let validRoleIds: string[] = [];
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      const existingRoles = await prisma.role.findMany({
        where: {
          id: { in: roleIds },
          tenantId: session.user.tenantId,
        },
        select: { id: true },
      });
      validRoleIds = existingRoles.map((r: { id: string }) => r.id);
    }

    // Create user and role assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          tenantId: session.user.tenantId!,
          name,
          email,
          password: hashedPassword,
          role,
          emailVerified: new Date(), // Auto-verify for admin-created users
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

      // Assign additional roles if provided
      if (validRoleIds.length > 0) {
        await Promise.all(
          validRoleIds.map(roleId =>
            tx.userRoleAssignment.create({
              data: {
                userId: user.id,
                roleId,
                assignedBy: session.user.id,
              },
            })
          )
        );
      }

      return user;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}