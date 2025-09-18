// Test NextAuth authorization directly
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDirectAuth() {
  try {
    console.log('🔍 Testing direct authentication for admin@demo.com');
    
    const credentials = {
      email: 'admin@demo.com',
      password: 'demo123',
      tenantSubdomain: 'demo'
    };
    
    console.log('📧 Looking up user with tenant...');
    
    // Simulate the exact query from auth.ts
    const user = await prisma.user.findFirst({
      where: {
        email: credentials.email,
        tenant: {
          subdomain: credentials.tenantSubdomain || 'demo',
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true,
          },
        },
      },
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`🏢 Tenant: ${user.tenant?.name} (${user.tenant?.subdomain})`);
    console.log(`📊 User status: ${user.isActive ? 'Active' : 'Inactive'}`);
    console.log(`🏢 Tenant status: ${user.tenant?.status}`);
    
    // Check tenant status
    if (!user.tenant || user.tenant.status === 'CANCELLED' || user.tenant.status === 'SUSPENDED') {
      console.log('❌ Tenant is inactive or not found');
      return;
    }
    
    console.log('✅ Tenant is active, checking password');
    
    // Check password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    console.log(`🔐 Password validation: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!isPasswordValid) {
      console.log('❌ Authentication failed - invalid password');
      return;
    }
    
    console.log('✅ Password valid, checking subscription...');
    
    // Check subscription (simplified)
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        status: true,
        currentPeriodEnd: true,
        planId: true,
      },
    });
    
    if (!subscription) {
      console.log('❌ No subscription found');
      return;
    }
    
    console.log(`📋 Subscription status: ${subscription.status}`);
    console.log(`📅 Current period end: ${subscription.currentPeriodEnd}`);
    
    const now = new Date();
    const isExpired = subscription.currentPeriodEnd ? now > subscription.currentPeriodEnd : false;
    const isActive = subscription.status === 'ACTIVE' || subscription.status === 'TRIALING';
    const subscriptionValid = isActive && !isExpired;
    
    console.log(`⏰ Is expired: ${isExpired}`);
    console.log(`✅ Is active: ${isActive}`);
    console.log(`🎯 Subscription valid: ${subscriptionValid}`);
    
    if (!subscriptionValid) {
      console.log('❌ Subscription validation failed');
      return;
    }
    
    console.log('🎉 ALL CHECKS PASSED - Authentication should succeed!');
    
  } catch (error) {
    console.error('❌ Error during direct auth test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectAuth();