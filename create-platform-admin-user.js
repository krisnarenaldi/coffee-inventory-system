const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createPlatformAdmin() {
  try {
    console.log('Creating PLATFORM_ADMIN user...');
    
    const adminEmail = 'platform@admin.com';
    const adminPassword = 'PlatformAdmin123!';
    
    // Check if admin user already exists
    let adminUser = await prisma.user.findFirst({
      where: { 
        email: adminEmail,
        role: 'PLATFORM_ADMIN'
      }
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      // Get the first tenant to associate with (required by schema)
      const firstTenant = await prisma.tenant.findFirst();
      
      if (!firstTenant) {
        console.error('No tenant found. Please create a tenant first.');
        return;
      }
      
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Platform Administrator',
          role: 'PLATFORM_ADMIN',
          tenantId: firstTenant.id, // Associate with first tenant
          isActive: true,
          emailVerified: new Date()
        }
      });
      
      console.log('✅ Created PLATFORM_ADMIN user:', adminEmail);
      console.log('⚠️  Default password:', adminPassword, '(CHANGE THIS IMMEDIATELY)');
      console.log('📧 Email:', adminUser.email);
      console.log('👤 Name:', adminUser.name);
      console.log('🔑 Role:', adminUser.role);
      console.log('🏢 Associated Tenant:', firstTenant.name);
    } else {
      console.log('✅ PLATFORM_ADMIN user already exists:', adminEmail);
      
      // Update role if needed
      if (adminUser.role !== 'PLATFORM_ADMIN') {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { role: 'PLATFORM_ADMIN' }
        });
        console.log('✅ Updated user role to PLATFORM_ADMIN');
      }
      
      console.log('📧 Email:', adminUser.email);
      console.log('👤 Name:', adminUser.name);
      console.log('🔑 Role:', adminUser.role);
    }
    
    console.log('\n🎉 Platform admin setup completed successfully!');
    console.log('\n📝 Login Instructions:');
    console.log('1. Go to your application login page');
    console.log('2. Use email:', adminEmail);
    console.log('3. Use password:', adminPassword);
    console.log('4. IMPORTANT: Change the password immediately after first login');
    
  } catch (error) {
    console.error('❌ Error creating platform admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPlatformAdmin();