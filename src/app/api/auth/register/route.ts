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

    // Enforce breweryName max length of 50 characters
    if (breweryName.trim().length > 50) {
      return NextResponse.json(
        { error: 'Brewery name must be at most 50 characters' },
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

    // Create tenant and user in a transaction with timeout
    const result = await prisma.$transaction(async (tx) => {
      // Determine the plan to use inside transaction for consistency
      const planId = plan ? `${plan}-plan` : 'free-plan';
      console.log('Looking for plan with ID:', planId);
      
      let selectedPlan = await tx.subscriptionPlan.findFirst({
        where: {
          id: planId
        }
      });
      console.log('Found plan:', selectedPlan ? selectedPlan.id : 'null');

      if (!selectedPlan) {
        console.log('Plan not found, falling back to starter-plan');
        // Fallback to Starter plan if specified plan not found
        selectedPlan = await tx.subscriptionPlan.findFirst({
          where: { id: 'starter-plan' },
        });
        console.log('Fallback plan:', selectedPlan ? selectedPlan.id : 'null');
        
        if (!selectedPlan) {
          console.error('No subscription plans found in database');
          throw new Error('Subscription plan not found');
        }
      }
      // Create tenant
      console.log('Creating tenant with subdomain:', subdomain);
      const tenant = await tx.tenant.create({
        data: {
          name: breweryName,
          subdomain,
          status: 'ACTIVE',
        },
      });
      console.log('Tenant created successfully:', tenant.id);

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
      console.log('Creating subscription with data:', subscriptionData);
      const subscription = await tx.subscription.create({
        data: subscriptionData,
      });
      console.log('Subscription created successfully:', subscription.id);

      // Create admin user
      console.log('Creating user with email:', email);
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
      console.log('User created successfully:', user.id);

      // Create default roles for the tenant
      console.log('Creating default roles for tenant:', tenant.id);
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

      try {
        const createdRoles = await Promise.all(
          roles.map((role) => tx.role.create({ data: role }))
        );
        console.log('Roles created successfully:', createdRoles.length);

        // Assign admin role to the user
        const adminRole = createdRoles.find((role) => role.name === 'Admin');
        if (adminRole) {
          await tx.userRoleAssignment.create({
            data: {
              userId: user.id,
              roleId: adminRole.id,
            },
          });
          console.log('Admin role assigned successfully');
        }
      } catch (roleError) {
        console.error('Error creating roles:', roleError);
        // Don't fail the entire registration if role creation fails
        // Roles can be created later
      }

      // Create default tenant settings
      console.log('Creating default tenant settings');
      const defaultSettings = [
        { key: 'timezone', value: 'UTC' },
        { key: 'currency', value: 'IDR' },
        { key: 'date_format', value: 'MM/DD/YYYY' },
        { key: 'low_stock_threshold', value: '10' },
        { key: 'enable_notifications', value: 'true' },
      ];

      try {
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
        console.log('Tenant settings created successfully');
      } catch (settingsError) {
        console.error('Error creating tenant settings:', settingsError);
        // Don't fail the entire registration if settings creation fails
      }

      return { tenant, user, subscription };
    }, {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
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
    
    // Provide more specific error messages for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for specific database constraint errors
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Account with this information already exists' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('subdomain')) {
        return NextResponse.json(
          { error: 'Subdomain already taken' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}