import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

interface OnboardingRequest {
  name: string;
  subdomain: string;
  domain?: string;
  adminEmail: string;
  adminName: string;
  planId: string;
  industry?: string;
  companySize?: string;
  setupPreferences?: {
    enableInventoryAlerts: boolean;
    defaultCurrency: string;
    timezone: string;
    dateFormat: string;
  };
}

// POST /api/admin/tenants/onboard - Enhanced tenant onboarding
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const body: OnboardingRequest = await request.json();
    const { 
      name, 
      subdomain, 
      domain, 
      adminEmail, 
      adminName, 
      planId,
      industry,
      companySize,
      setupPreferences 
    } = body;

    // Validate required fields
    if (!name || !subdomain || !adminEmail || !adminName || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Generate secure temporary password
    const tempPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create tenant with full onboarding setup in a transaction
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
          stripeCustomerId: null,
          stripeSubscriptionId: null
        }
      });

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          tenantId: tenant.id,
          emailVerified: null, // Require email verification
          role: 'ADMIN'
        }
      });

      // Create comprehensive tenant settings
      const defaultSettings = [
        {
          tenantId: tenant.id,
          key: 'TIMEZONE',
          value: setupPreferences?.timezone || 'UTC'
        },
        {
          tenantId: tenant.id,
          key: 'CURRENCY',
          value: setupPreferences?.defaultCurrency || 'IDR'
        },
        {
          tenantId: tenant.id,
          key: 'DATE_FORMAT',
          value: setupPreferences?.dateFormat || 'MM/DD/YYYY'
        },
        {
          tenantId: tenant.id,
          key: 'INVENTORY_ALERTS',
          value: setupPreferences?.enableInventoryAlerts !== false ? 'true' : 'false'
        },
        {
          tenantId: tenant.id,
          key: 'LOW_STOCK_THRESHOLD',
          value: '10'
        },
        {
          tenantId: tenant.id,
          key: 'INDUSTRY',
          value: industry || 'COFFEE_ROASTING'
        },
        {
          tenantId: tenant.id,
          key: 'COMPANY_SIZE',
          value: companySize || 'SMALL'
        },
        {
          tenantId: tenant.id,
          key: 'ONBOARDING_STATUS',
          value: 'PENDING'
        },
        {
          tenantId: tenant.id,
          key: 'SETUP_COMPLETED',
          value: 'false'
        }
      ];

      await tx.tenantSetting.createMany({
        data: defaultSettings
      });

      // Create sample data for better onboarding experience
      await createSampleData(tx, tenant.id, adminUser.id);

      return {
        tenant,
        subscription,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        },
        tempPassword
      };
    });

    // Send welcome email (in a real implementation, this would use an email service)
    await sendWelcomeEmail({
      tenantName: name,
      adminName,
      adminEmail,
      subdomain,
      tempPassword,
      planName: plan.name
    });

    return NextResponse.json({
      message: 'Tenant onboarded successfully',
      tenant: result.tenant,
      adminUser: result.adminUser,
      subscription: result.subscription,
      onboardingUrl: `https://${subdomain}.coffeelogica.com/onboarding`,
      loginUrl: `https://${subdomain}.coffeelogica.com/auth/signin`,
      tempPassword: result.tempPassword // In production, this should not be returned
    }, { status: 201 });

  } catch (error) {
    console.error('Error onboarding tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate secure password
function generateSecurePassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Helper function to create sample data
async function createSampleData(tx: Prisma.TransactionClient, tenantId: string, adminUserId: string) {
  // Create sample supplier
  const sampleSupplier = await tx.supplier.create({
    data: {
      tenantId,
      name: 'Sample Coffee Supplier',
      contactPerson: 'John Doe',
      email: 'supplier@coffeelogica.com',
      phone: '+1-555-0123',
      address: '123 Coffee Street, Bean City, BC 12345',
      notes: 'Sample supplier for demonstration purposes'
    }
  });

  // Create sample ingredients
  const sampleIngredients = [
    {
      tenantId,
      name: 'Ethiopian Yirgacheffe',
      type: 'COFFEE_BEANS' as const,
      stockQuantity: 50,
      unitOfMeasure: 'lbs',
      minimumThreshold: 10,
      costPerUnit: 8.50,
      location: 'Storage Room A',
      supplierId: sampleSupplier.id
    },
    {
      tenantId,
      name: 'Colombian Supremo',
      type: 'COFFEE_BEANS' as const,
      stockQuantity: 75,
      unitOfMeasure: 'lbs',
      minimumThreshold: 15,
      costPerUnit: 7.25,
      location: 'Storage Room A',
      supplierId: sampleSupplier.id
    },
    {
      tenantId,
      name: 'Whole Milk',
      type: 'MILK' as const,
      stockQuantity: 20,
      unitOfMeasure: 'gallons',
      minimumThreshold: 5,
      costPerUnit: 3.50,
      location: 'Refrigerator',
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }
  ];

  await tx.ingredient.createMany({
    data: sampleIngredients
  });

  // Create sample recipe
  const ingredients = await tx.ingredient.findMany({
    where: { tenantId },
    take: 2
  });

  if (ingredients.length >= 2) {
    const sampleRecipe = await tx.recipe.create({
      data: {
        tenantId,
        name: 'House Blend',
        style: 'Medium Roast',
        description: 'Our signature house blend combining Ethiopian and Colombian beans',
        expectedYield: 10,
        processInstructions: '1. Preheat roaster to 400°F\n2. Add beans gradually\n3. Roast for 12-14 minutes\n4. Cool immediately'
      }
    });

    // Add recipe ingredients
    await tx.recipeIngredient.createMany({
      data: [
        {
          recipeId: sampleRecipe.id,
          ingredientId: ingredients[0].id,
          quantity: 3,
          unit: 'lbs',
          notes: 'Primary bean for brightness'
        },
        {
          recipeId: sampleRecipe.id,
          ingredientId: ingredients[1].id,
          quantity: 2,
          unit: 'lbs',
          notes: 'Secondary bean for body'
        }
      ]
    });
  }
}

// Helper function to send welcome email (mock implementation)
async function sendWelcomeEmail(data: {
  tenantName: string;
  adminName: string;
  adminEmail: string;
  subdomain: string;
  tempPassword: string;
  planName: string;
}) {
  // In a real implementation, this would integrate with an email service like SendGrid, AWS SES, etc.
  console.log('Welcome email would be sent to:', data.adminEmail);
  console.log('Email content would include:');
  console.log('- Welcome message');
  console.log('- Login credentials');
  console.log('- Onboarding checklist');
  console.log('- Support contact information');
  
  // For now, just log the email content
  const emailContent = {
    to: data.adminEmail,
    subject: `Welcome to Brewery Inventory - ${data.tenantName}`,
    body: `
      Dear ${data.adminName},
      
      Welcome to Brewery Inventory! Your account has been successfully created.
      
      Account Details:
      - Company: ${data.tenantName}
      - Plan: ${data.planName}
      - Login URL: https://${data.subdomain}.coffeelogica.com
      - Temporary Password: ${data.tempPassword}
      
      Next Steps:
      1. Log in using your temporary password
      2. Change your password
      3. Complete the onboarding checklist
      4. Invite your team members
      
      If you need help, please contact our support team.
      
      Best regards,
      The Brewery Inventory Team
    `
  };
  
  console.log('Email content:', emailContent);
  
  // Return success for now
  return Promise.resolve();
}