import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../lib/prisma';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  breweryName: string;
  subdomain: string;
  plan?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { name, email, password, breweryName, subdomain, plan } = body;

    // Validate required fields
    if (!name || !email || !password || !breweryName || !subdomain) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain) || subdomain.length < 3) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 409 }
      );
    }

    // Check if email already exists across all tenants
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine the plan to use - default to "free-plan" if no plan provided
    const planId = plan ? `${plan}-plan` : 'free-plan';
    let selectedPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        id: planId
      }
    });

    if (!selectedPlan) {
      // Fallback to Starter plan if specified plan not found
      selectedPlan = await prisma.subscriptionPlan.findFirst({
        where: { id: 'starter-plan' },
      });
      
      if (!selectedPlan) {
        return NextResponse.json(
          { error: 'Subscription plan not found' },
          { status: 500 }
        );
      }
    }

    // Create tenant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: breweryName,
          subdomain,
          status: 'ACTIVE',
        },
      });

      // Determine subscription configuration based on plan
      let subscriptionData: any;
      if (plan === 'free') {
        // Free plan: no expiration (null currentPeriodEnd)
        subscriptionData = {
          tenantId: tenant.id,
          planId: selectedPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: null, // Forever access for free plan
          intendedPlan: 'free',
        };
      } else if (plan === 'starter' || plan === 'professional') {
        // Paid plans: set as pending checkout initially
        subscriptionData = {
          tenantId: tenant.id,
          planId: 'free-plan', // Start with free plan until payment is completed
          status: 'PENDING_CHECKOUT',
          currentPeriodStart: new Date(),
          currentPeriodEnd: null, // Will be set after successful payment
          intendedPlan: plan,
        };
      } else {
        // Default to free plan
        subscriptionData = {
          tenantId: tenant.id,
          planId: selectedPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
          intendedPlan: 'free',
        };
      }

      // Create subscription for the tenant
      const subscription = await tx.subscription.create({
        data: subscriptionData,
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name,
          password: hashedPassword,
          role: 'ADMIN',
          emailVerified: new Date(), // Auto-verify for demo purposes
        },
      });

      // Create default roles for the tenant
      const roles = [
        {
          name: 'Admin',
          description: 'Full access to all brewery operations',
          isSystem: true,
          tenantId: tenant.id,
        },
        {
          name: 'Manager',
          description: 'Manage operations and view reports',
          isSystem: true,
          tenantId: tenant.id,
        },
        {
          name: 'Brewmaster',
          description: 'Manage recipes and production batches',
          isSystem: true,
          tenantId: tenant.id,
        },
        {
          name: 'Warehouse Staff',
          description: 'Manage inventory and shipments',
          isSystem: true,
          tenantId: tenant.id,
        },
        {
          name: 'Sales',
          description: 'View products and manage orders',
          isSystem: true,
          tenantId: tenant.id,
        },
      ];

      const createdRoles = await Promise.all(
        roles.map((role) => tx.role.create({ data: role }))
      );

      // Assign admin role to the user
      const adminRole = createdRoles.find((role) => role.name === 'Admin');
      if (adminRole) {
        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            roleId: adminRole.id,
          },
        });
      }

      // Create default tenant settings
      const defaultSettings = [
        { key: 'timezone', value: 'UTC' },
        { key: 'currency', value: 'IDR' },
        { key: 'date_format', value: 'MM/DD/YYYY' },
        { key: 'low_stock_threshold', value: '10' },
        { key: 'enable_notifications', value: 'true' },
      ];

      await Promise.all(
        defaultSettings.map((setting) =>
          tx.tenantSetting.create({
            data: {
              tenantId: tenant.id,
              key: setting.key,
              value: setting.value,
            },
          })
        )
      );

      return { tenant, user, subscription };
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          subdomain: result.tenant.subdomain,
        },
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        subscription: {
          status: result.subscription.status,
          intendedPlan: (result.subscription as any).intendedPlan,
        },
        requiresCheckout: plan === 'starter' || plan === 'professional',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}