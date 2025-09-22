import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import bcrypt from 'bcryptjs';

interface AdminUserResult {
  email: string;
  name: string | null;
  role: string;
  created: boolean;
}

interface SubscriptionResult {
  planName: string;
  status: string;
  validUntil: string;
  created: boolean;
}

// POST /api/admin/setup-platform-admin - Create platform admin and fix subscription
export async function POST(request: NextRequest) {
  try {
    console.log('Starting platform admin creation and subscription fix...');

    // Check if tenant exists
    const tenantId = 'cmfp2yyth0000ro9yinlxkqx4';
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        },
        users: true
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: `Tenant with ID ${tenantId} not found` },
        { status: 404 }
      );
    }

    const results = {
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        hasSubscription: !!tenant.subscription
      },
      adminUser: null as AdminUserResult | null,
      subscription: null as SubscriptionResult | null,
      actions: [] as string[]
    };

    // Create PLATFORM_ADMIN user
    const adminEmail = 'admin@coffeelogica.com';
    const adminPassword = 'Admin123!'; // You should change this password after creation
    
    // Check if admin user already exists
    let adminUser = await prisma.user.findFirst({
      where: { 
        email: adminEmail,
        role: 'PLATFORM_ADMIN'
      }
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      // For PLATFORM_ADMIN, we'll use a special tenant or create without tenant relationship
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Platform Administrator',
          role: 'PLATFORM_ADMIN',
          isActive: true,
          emailVerified: new Date(),
          tenant: {
            connect: { id: tenantId } // Connect to the existing tenant for now
          }
        }
      });
      
      results.adminUser = {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        created: true
      };
      results.actions.push(`Created PLATFORM_ADMIN user: ${adminEmail}`);
      results.actions.push(`⚠️ Default password: ${adminPassword} (CHANGE THIS IMMEDIATELY)`);
    } else {
      results.adminUser = {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        created: false
      };
      results.actions.push(`PLATFORM_ADMIN user already exists: ${adminEmail}`);
      
      // Update role if needed
      if (adminUser.role !== 'PLATFORM_ADMIN') {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { role: 'PLATFORM_ADMIN' }
        });
        results.actions.push(`Updated user role to PLATFORM_ADMIN`);
      }
    }

    // Fix missing subscription for the tenant
    if (!tenant.subscription) {
      results.actions.push(`Creating subscription for tenant ${tenant.name}...`);
      
      // Find or create a subscription plan
      let premiumPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'Premium Plan' }
      });

      if (!premiumPlan) {
        premiumPlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Premium Plan',
            description: 'Full access to all features',
            price: 29.99,
            interval: 'MONTHLY',
            maxUsers: 50,
            maxIngredients: 1000,
            maxBatches: 500,
            maxStorageLocations: 20,
            maxRecipes: 200,
            maxProducts: 200,
            features: {
              reports: true,
              analytics: true,
              api_access: true,
              priority_support: true
            },
            isActive: true
          }
        });
        results.actions.push(`Created Premium Plan`);
      }

      // Create subscription
      const now = new Date();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now

      const subscription = await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: premiumPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: false
        }
      });

      results.subscription = {
        planName: premiumPlan.name,
        status: subscription.status,
        validUntil: subscription.currentPeriodEnd.toISOString(),
        created: true
      };
      results.actions.push(`Created subscription for tenant ${tenant.name}`);
      results.actions.push(`Plan: ${premiumPlan.name}`);
      results.actions.push(`Status: ${subscription.status}`);
      results.actions.push(`Valid until: ${subscription.currentPeriodEnd.toISOString()}`);
    } else {
      results.subscription = {
        planName: tenant.subscription.plan?.name || 'Unknown',
        status: tenant.subscription.status,
        validUntil: tenant.subscription.currentPeriodEnd?.toISOString() || 'Unknown',
        created: false
      };
      results.actions.push(`Tenant ${tenant.name} already has a subscription`);
    }

    results.actions.push('All tasks completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Platform admin setup and subscription fix completed',
      results
    });

  } catch (error) {
    console.error('Error in setup-platform-admin:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}