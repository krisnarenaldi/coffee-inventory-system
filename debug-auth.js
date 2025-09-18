const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debugAuth() {
  try {
    console.log('🔍 Debugging authentication for admin@demo.com');
    
    // 1. Check if demo tenant exists
    const demoTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'demo' }
    });
    
    console.log('🏢 Demo tenant:', demoTenant ? `Found (${demoTenant.id})` : 'Not found');
    
    if (!demoTenant) {
      console.log('❌ Demo tenant not found! This is the issue.');
      return;
    }
    
    // 2. Check if user exists in demo tenant
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: demoTenant.id,
          email: 'admin@demo.com'
        }
      },
      include: {
        tenant: true
      }
    });
    
    console.log('👤 User lookup:', user ? `Found (${user.name}, ${user.role})` : 'Not found');
    
    if (!user) {
      console.log('❌ User not found in demo tenant!');
      
      // Check if user exists in any tenant
      const anyUser = await prisma.user.findFirst({
        where: { email: 'admin@demo.com' },
        include: { tenant: true }
      });
      
      if (anyUser) {
        console.log(`🔍 User found in different tenant: ${anyUser.tenant.subdomain}`);
      }
      return;
    }
    
    // 3. Check password
    const passwordMatch = await bcrypt.compare('demo123', user.password);
    console.log('🔐 Password match:', passwordMatch);
    
    // 4. Check user status
    console.log('✅ User active:', user.isActive);
    console.log('📧 Email verified:', user.emailVerified ? 'Yes' : 'No');
    
    // 5. Summary
    console.log('\n📋 Summary:');
    console.log(`- Tenant: ${user.tenant.name} (${user.tenant.subdomain})`);
    console.log(`- User: ${user.name} (${user.email})`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Active: ${user.isActive}`);
    console.log(`- Password: ${passwordMatch ? 'Correct' : 'Incorrect'}`);
    
    if (demoTenant && user && passwordMatch && user.isActive) {
      console.log('\n✅ All authentication requirements met! Issue might be elsewhere.');
    } else {
      console.log('\n❌ Authentication requirements not met.');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();