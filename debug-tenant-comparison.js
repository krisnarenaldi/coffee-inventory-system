const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debugTenantComparison() {
  try {
    console.log('🔍 Debugging tenant comparison: demo vs coffee-central\n');
    
    // Check both tenants
    const demoTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'demo' },
      include: {
        subscription: {
          include: { plan: true }
        },
        users: {
          where: { email: 'admin@demo.com' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerified: true,
            password: true
          }
        }
      }
    });
    
    const coffeeCentralTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'coffee-central' },
      include: {
        subscription: {
          include: { plan: true }
        },
        users: {
          where: { email: 'admin@coffeecentral.com' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerified: true,
            password: true
          }
        }
      }
    });
    
    console.log('=== DEMO TENANT ===');
    if (demoTenant) {
      console.log('✅ Tenant found:', {
        id: demoTenant.id,
        name: demoTenant.name,
        subdomain: demoTenant.subdomain,
        status: demoTenant.status
      });
      
      console.log('📋 Subscription:', demoTenant.subscription ? {
        id: demoTenant.subscription.id,
        status: demoTenant.subscription.status,
        currentPeriodStart: demoTenant.subscription.currentPeriodStart,
        currentPeriodEnd: demoTenant.subscription.currentPeriodEnd,
        planName: demoTenant.subscription.plan?.name,
        isExpired: new Date() > demoTenant.subscription.currentPeriodEnd
      } : 'No subscription found');
      
      console.log('👤 User (admin@demo.com):', demoTenant.users[0] ? {
        id: demoTenant.users[0].id,
        email: demoTenant.users[0].email,
        name: demoTenant.users[0].name,
        role: demoTenant.users[0].role,
        isActive: demoTenant.users[0].isActive,
        emailVerified: !!demoTenant.users[0].emailVerified,
        hasPassword: !!demoTenant.users[0].password
      } : 'User not found');
    } else {
      console.log('❌ Demo tenant not found');
    }
    
    console.log('\n=== COFFEE-CENTRAL TENANT ===');
    if (coffeeCentralTenant) {
      console.log('✅ Tenant found:', {
        id: coffeeCentralTenant.id,
        name: coffeeCentralTenant.name,
        subdomain: coffeeCentralTenant.subdomain,
        status: coffeeCentralTenant.status
      });
      
      console.log('📋 Subscription:', coffeeCentralTenant.subscription ? {
        id: coffeeCentralTenant.subscription.id,
        status: coffeeCentralTenant.subscription.status,
        currentPeriodStart: coffeeCentralTenant.subscription.currentPeriodStart,
        currentPeriodEnd: coffeeCentralTenant.subscription.currentPeriodEnd,
        planName: coffeeCentralTenant.subscription.plan?.name,
        isExpired: new Date() > coffeeCentralTenant.subscription.currentPeriodEnd
      } : 'No subscription found');
      
      console.log('👤 User (admin@coffeecentral.com):', coffeeCentralTenant.users[0] ? {
        id: coffeeCentralTenant.users[0].id,
        email: coffeeCentralTenant.users[0].email,
        name: coffeeCentralTenant.users[0].name,
        role: coffeeCentralTenant.users[0].role,
        isActive: coffeeCentralTenant.users[0].isActive,
        emailVerified: !!coffeeCentralTenant.users[0].emailVerified,
        hasPassword: !!coffeeCentralTenant.users[0].password
      } : 'User not found');
    } else {
      console.log('❌ Coffee-central tenant not found');
    }
    
    // Test password validation for both users
    console.log('\n=== PASSWORD VALIDATION TEST ===');
    
    if (demoTenant?.users[0]?.password) {
      const demoPasswordValid = await bcrypt.compare('password123', demoTenant.users[0].password);
      console.log('🔐 Demo user password valid:', demoPasswordValid);
    }
    
    if (coffeeCentralTenant?.users[0]?.password) {
      const coffeePasswordValid = await bcrypt.compare('password123', coffeeCentralTenant.users[0].password);
      console.log('🔐 Coffee-central user password valid:', coffeePasswordValid);
    }
    
    // Check subscription validation logic
    console.log('\n=== SUBSCRIPTION VALIDATION SIMULATION ===');
    
    const now = new Date();
    
    if (demoTenant?.subscription) {
      const demoIsExpired = demoTenant.subscription.currentPeriodEnd ? now > demoTenant.subscription.currentPeriodEnd : false;
      const demoIsActive = (demoTenant.subscription.status === "ACTIVE" || demoTenant.subscription.status === "TRIALING") && !demoIsExpired;
      console.log('📊 Demo subscription validation:', {
        status: demoTenant.subscription.status,
        isExpired: demoIsExpired,
        isActive: demoIsActive,
        wouldPassAuth: demoIsActive
      });
    }
    
    if (coffeeCentralTenant?.subscription) {
      const coffeeIsExpired = coffeeCentralTenant.subscription.currentPeriodEnd ? now > coffeeCentralTenant.subscription.currentPeriodEnd : false;
      const coffeeIsActive = (coffeeCentralTenant.subscription.status === "ACTIVE" || coffeeCentralTenant.subscription.status === "TRIALING") && !coffeeIsExpired;
      console.log('📊 Coffee-central subscription validation:', {
        status: coffeeCentralTenant.subscription.status,
        isExpired: coffeeIsExpired,
        isActive: coffeeIsActive,
        wouldPassAuth: coffeeIsActive
      });
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTenantComparison();
