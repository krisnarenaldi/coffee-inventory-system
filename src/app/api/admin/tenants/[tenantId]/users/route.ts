import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '../../../../../../../lib/prisma';
import { logResourceCreated, logResourceUpdated, logResourceDeleted } from '../../../../../../../lib/activity-logger';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schema for user creation
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'SALES']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  isActive: z.boolean().default(true)
});

// Validation schema for user updates
const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'SALES']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional()
});

// GET /api/admin/tenants/[tenantId]/users - Get all users for a specific tenant
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
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

    const { tenantId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');
    
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              batches: true,
              alerts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + users.length < total
      }
    });

  } catch (error) {
    console.error('Error fetching tenant users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tenants/[tenantId]/users - Create a new user for a specific tenant
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
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

    const { tenantId } = params;
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if user with email already exists in this tenant
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: validatedData.email
        }
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in this tenant' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role,
        password: hashedPassword,
        isActive: validatedData.isActive
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log activity
    await logResourceCreated(
      tenantId,
      session.user.id,
      'user',
      user.id,
      user.name || user.email
    );

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    }, { status: 201 });

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

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}