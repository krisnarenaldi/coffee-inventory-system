import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow with a secret key
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const tenantId = searchParams.get('tenantId');
    
    if (secret !== 'fix-subscription-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    
    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    
    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { tenantId }
    });
    
    if (existingSubscription) {
      return NextResponse.json({
        message: 'Subscription already exists',
        subscription: {
          id: existingSubscription.id,
          status: existingSubscription.status,
          currentPeriodEnd: existingSubscription.currentPeriodEnd
        }
      });
    }
    
    // Find or create a premium subscription plan
    let premiumPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: 'Premium Plan' }
    });
    
    if (!premiumPlan) {
      // Create a premium plan if it doesn't exist
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
    }
    
    // Create subscription with a future end date
    const now = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
    
    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId: premiumPlan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: futureDate,
        cancelAtPeriodEnd: false
      }
    });
    
    return NextResponse.json({
      message: 'Subscription created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain
      },
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        planName: premiumPlan.name
      }
    });
    
  } catch (error) {
    console.error('Fix subscription error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
