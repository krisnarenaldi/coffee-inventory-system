const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllPlans() {
  try {
    console.log('📋 All Subscription Plans and Features:\n');
    
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });
    
    plans.forEach(plan => {
      console.log(`🏷️  ${plan.name.toUpperCase()} PLAN`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   Price: $${plan.price}/month`);
      console.log(`   Max Users: ${plan.maxUsers}`);
      console.log(`   Max Ingredients: ${plan.maxIngredients}`);
      console.log(`   Max Batches: ${plan.maxBatches}`);
      console.log(`   Max Recipes: ${plan.maxRecipes}`);
      console.log(`   Max Products: ${plan.maxProducts}`);
      console.log(`   Max Storage Locations: ${plan.maxStorageLocations}`);
      console.log(`   Features:`);
      if (plan.features && plan.features.length > 0) {
        plan.features.forEach(feature => {
          console.log(`     ✅ ${feature}`);
        });
      } else {
        console.log(`     ❌ No features listed`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPlans();
