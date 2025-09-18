const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'admin@coffeecentral.com' },
      include: { tenant: true }
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Name:', user.name);
      console.log('- Role:', user.role);
      console.log('- Active:', user.isActive);
      console.log('- Tenant ID:', user.tenantId);
      console.log('- Tenant Name:', user.tenant?.name);
      console.log('- Tenant Subdomain:', user.tenant?.subdomain);
      console.log('- Tenant Status:', user.tenant?.status);
      console.log('- Has Password:', !!user.password);
      console.log('- Password Hash (first 20 chars):', user.password?.substring(0, 20) + '...');
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();