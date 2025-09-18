const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createDemoUser() {
  try {
    // First, check if demo tenant exists
    let demoTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'demo' }
    });

    if (!demoTenant) {
      console.log('Creating demo tenant...');
      demoTenant = await prisma.tenant.create({
        data: {
          name: 'Demo Coffee Shop',
          subdomain: 'demo',
          status: 'ACTIVE',
        }
      });
      console.log('✅ Demo tenant created:', demoTenant.name);
    } else {
      console.log('✅ Demo tenant already exists:', demoTenant.name);
    }

    // Check if demo user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: 'admin@demo.com',
        tenantId: demoTenant.id
      }
    });

    if (existingUser) {
      console.log('✅ Demo user already exists');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create demo user
    const demoUser = await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        name: 'Demo Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        tenantId: demoTenant.id,
      }
    });

    console.log('✅ Demo user created successfully!');
    console.log('Login credentials:');
    console.log('- URL: http://localhost:3000/auth/signin');
    console.log('- Email: admin@demo.com');
    console.log('- Password: password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();