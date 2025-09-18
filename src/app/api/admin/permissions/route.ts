import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/admin/permissions - Get all permissions
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
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        resource: true,
        action: true,
        createdAt: true,
      },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Permissions fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/permissions - Create a new permission
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
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, resource, action } = body;

    // Validate required fields
    if (!name || !resource || !action) {
      return NextResponse.json(
        { error: 'Name, resource, and action are required' },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { name: name.trim() },
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: 'Permission already exists' },
        { status: 409 }
      );
    }

    const permission = await prisma.permission.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        resource: resource.trim(),
        action: action.trim(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        resource: true,
        action: true,
        createdAt: true,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error('Permission creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}