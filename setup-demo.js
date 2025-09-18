const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setupDemoUser() {
  try {
    // Check if demo tenant exists
    let demoTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'demo' }
    });
    
    if (!demoTenant) {
      console.log('Creating demo tenant...');
      demoTenant = await prisma.tenant.create({
        data: {
          name: 'Demo Company',
          subdomain: 'demo',
          status: 'ACTIVE',
          subscriptionPlan: 'PREMIUM',
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        }
      });
      console.log('✅ Demo tenant created:', demoTenant.id);
    } else {
      console.log('✅ Demo tenant exists:', demoTenant.id);
    }
    
    // Check if admin@demo.com user exists
    let adminUser = await prisma.user.findFirst({
      where: { 
        email: 'admin@demo.com'
      }
    });
    
    if (!adminUser) {
      console.log('Creating admin@demo.com user...');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@demo.com',
          name: 'Demo Admin',
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: demoTenant.id,
          isActive: true,
          emailVerified: new Date()
        }
      });
      console.log('✅ Admin user created:', adminUser.id);
    } else {
      console.log('✅ Admin user exists:', adminUser.id);
      // Update password and tenant if needed
      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { 
          password: hashedPassword,
          tenantId: demoTenant.id,
          isActive: true
        }
      });
      console.log('✅ Admin user password updated');
    }
    
    // Verify the setup
    const verifyUser = await prisma.user.findFirst({
      where: { email: 'admin@demo.com' },
      include: { tenant: true }
    });
    
    console.log('\n📋 Final verification:');
    console.log('User:', {
      id: verifyUser.id,
      email: verifyUser.email,
      name: verifyUser.name,
      role: verifyUser.role,
      isActive: verifyUser.isActive,
      tenantId: verifyUser.tenantId,
      tenant: verifyUser.tenant ? {
        id: verifyUser.tenant.id,
        name: verifyUser.tenant.name,
        subdomain: verifyUser.tenant.subdomain,
        status: verifyUser.tenant.status
      } : null
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDemoUser();