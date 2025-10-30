import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// GET /api/admin/tenants - Get all tenants (Platform Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { subdomain: { contains: search } },
        { domain: { contains: search } }
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
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
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.tenant.count({ where })
    ]);

    return NextResponse.json({
      tenants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tenants - Create new tenant (Platform Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, subdomain, domain, adminEmail, adminName, adminPassword, planId } = body;

    // Validate required fields
    if (!name || !subdomain || !adminEmail || !adminName || !adminPassword || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      );
    }

    // Check if subdomain is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain }
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already exists' },
        { status: 409 }
      );
    }

    // Check if domain is already taken (if provided)
    if (domain) {
      const existingDomain = await prisma.tenant.findFirst({
        where: { domain }
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 409 }
        );
      }
    }

    // Check if admin email is already taken
    const existingUser = await prisma.user.findFirst({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Admin email already exists' },
        { status: 409 }
      );
    }

    // Verify subscription plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    // Create tenant with admin user and subscription in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          subdomain,
          domain: domain || null,
          status: 'ACTIVE'
        }
      });

      // Create subscription
      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          stripeCustomerId: null, // Will be set when Stripe integration is added
          stripeSubscriptionId: null
        }
      });

      // Hash the provided password
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          tenantId: tenant.id,
          emailVerified: new Date(), // Auto-verify admin users
          role: 'ADMIN'
        }
      });

      // Create default tenant settings
      await tx.tenantSetting.createMany({
        data: [
          {
            tenantId: tenant.id,
            key: 'TIMEZONE',
            value: 'UTC'
          },
          {
            tenantId: tenant.id,
            key: 'CURRENCY',
            value: 'USD'
          },
          {
            tenantId: tenant.id,
            key: 'DATE_FORMAT',
            value: 'MM/DD/YYYY'
          },
          {
            tenantId: tenant.id,
            key: 'INVENTORY_ALERTS',
            value: 'true'
          },
          {
            tenantId: tenant.id,
            key: 'LOW_STOCK_THRESHOLD',
            value: '10'
          }
        ]
      });

      return {
        tenant,
        subscription,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        },
        adminPassword
      };
    });

    return NextResponse.json({
      message: 'Tenant created successfully',
      tenant: result.tenant,
      adminUser: result.adminUser,
      adminPassword: result.adminPassword,
      subscription: result.subscription
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}