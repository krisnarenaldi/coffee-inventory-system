const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugLimits() {
  const tenantId = 'cmh9vtq9400036mxe219kfwqr';
  
  try {
    console.log(`🔍 Debugging limits for tenant: ${tenantId}`);
    
    // Get subscription with plan details
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: { 
        plan: true,
        tenant: true
      }
    });
    
    console.log('📋 Subscription details:', {
      id: subscription?.id,
      planId: subscription?.planId,
      planName: subscription?.plan?.name,
      status: subscription?.status
    });
    
    console.log('📊 Plan limits:', {
      maxUsers: subscription?.plan?.maxUsers,
      maxIngredients: subscription?.plan?.maxIngredients,
      maxBatches: subscription?.plan?.maxBatches,
      maxStorageLocations: subscription?.plan?.maxStorageLocations,
      maxRecipes: subscription?.plan?.maxRecipes,
      maxProducts: subscription?.plan?.maxProducts
    });
    
    // Check current usage
    const [users, ingredients, batches, storageLocations, recipes, products] = await Promise.all([
      prisma.user.count({ where: { tenantId, isActive: true } }),
      prisma.ingredient.count({ where: { tenantId, isActive: true } }),
      prisma.batch.count({ where: { tenantId } }),
      prisma.storageLocation.count({ where: { tenantId, isActive: true } }),
      prisma.recipe.count({ where: { tenantId, isActive: true } }),
      prisma.product.count({ where: { tenantId } }),
    ]);
    
    console.log('\n📈 Current usage:', {
      users: `${users}/${subscription?.plan?.maxUsers}`,
      ingredients: `${ingredients}/${subscription?.plan?.maxIngredients}`,
      batches: `${batches}/${subscription?.plan?.maxBatches}`,
      storageLocations: `${storageLocations}/${subscription?.plan?.maxStorageLocations}`,
      recipes: `${recipes}/${subscription?.plan?.maxRecipes}`,
      products: `${products}/${subscription?.plan?.maxProducts}`
    });
    
    // Check if storage locations limit is reached
    const storageLocationLimit = subscription?.plan?.maxStorageLocations || 0;
    const isStorageLocationLimitReached = storageLocations >= storageLocationLimit;
    
    console.log('\n🚨 Storage Location Analysis:');
    console.log(`  Current: ${storageLocations}`);
    console.log(`  Limit: ${storageLocationLimit}`);
    console.log(`  Limit reached: ${isStorageLocationLimitReached}`);
    console.log(`  Can add more: ${!isStorageLocationLimitReached}`);
    
    // Compare with what Professional plan should have (from seed.ts)
    console.log('\n📋 Expected Professional Plan Limits (from seed.ts):');
    console.log('  maxUsers: 15');
    console.log('  maxIngredients: 500');
    console.log('  maxBatches: 200');
    console.log('  maxStorageLocations: Should be much higher than 2');
    console.log('  maxRecipes: Should be much higher than current');
    console.log('  maxProducts: Should be much higher than current');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLimits();