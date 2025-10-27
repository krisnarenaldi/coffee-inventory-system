import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration: Converting BREWMASTER roles to MANAGER...');
  
  // Find all users with BREWMASTER role
  const brewmasters = await prisma.user.findMany({
    where: {
      role: 'BREWMASTER',
    },
  });

  console.log(`Found ${brewmasters.length} users with BREWMASTER role`);

  // Update all BREWMASTER users to MANAGER
  const updatedUsers = await prisma.user.updateMany({
    where: {
      role: 'BREWMASTER',
    },
    data: {
      role: 'MANAGER',
    },
  });

  console.log(`Updated ${updatedUsers.count} users from BREWMASTER to MANAGER role`);
  
  // If you have any role assignments in other tables, update them here as well
  // For example, if you have a UserRoleAssignment table:
  // await prisma.userRoleAssignment.updateMany({
  //   where: { role: 'BREWMASTER' },
  //   data: { role: 'MANAGER' },
  // });

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
