const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProfessionalPlanLimits() {
  try {
    console.log('🔧 Fixing Professional plan limits...');
    
    // Find the professional plan
    const professionalPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: 'professional-plan' }
    });
    
    if (!professionalPlan) {
      console.log('❌ Professional plan not found');
      return;
    }
    
    console.log('📋 Current Professional plan limits:', {
      maxUsers: professionalPlan.maxUsers,
      maxIngredients: professionalPlan.maxIngredients,
      maxBatches: professionalPlan.maxBatches,
      maxStorageLocations: professionalPlan.maxStorageLocations,
      maxRecipes: professionalPlan.maxRecipes,
      maxProducts: professionalPlan.maxProducts
    });
    
    // Update the professional plan with proper limits
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: 'professional-plan' },
      data: {
        maxUsers: 15,           // Professional should have more users
        maxIngredients: 500,    // Much higher ingredient limit
        maxBatches: 200,        // Higher batch limit
        maxStorageLocations: 15, // Much higher storage locations
        maxRecipes: 50,         // Higher recipe limit  
        maxProducts: 500        // Higher product limit
      }
    });
    
    console.log('✅ Professional plan updated with new limits:', {
      maxUsers: updatedPlan.maxUsers,
      maxIngredients: updatedPlan.maxIngredients,
      maxBatches: updatedPlan.maxBatches,
      maxStorageLocations: updatedPlan.maxStorageLocations,
      maxRecipes: updatedPlan.maxRecipes,
      maxProducts: updatedPlan.maxProducts
    });
    
    // Also check if there are other plans that need fixing
    const allPlans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true }
    });
    
    console.log('\n📊 All active plans:');
    allPlans.forEach(plan => {
      console.log(`${plan.name} (${plan.id}):`);
      console.log(`  Storage Locations: ${plan.maxStorageLocations}`);
      console.log(`  Batches: ${plan.maxBatches}`);
      console.log(`  Recipes: ${plan.maxRecipes}`);
      console.log(`  Products: ${plan.maxProducts}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProfessionalPlanLimits();