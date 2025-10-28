const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBatchYield() {
    const tenantId = 'cmh9vtq9400036mxe219kfwqr';
    const batchNumber = 'BATCH-2025-005';

    try {
        console.log(`🔍 Debugging batch yield for: ${batchNumber}`);

        // Get the specific batch
        const batch = await prisma.batch.findFirst({
            where: {
                tenantId,
                batchNumber
            },
            include: {
                recipe: {
                    include: {
                        ingredients: {
                            include: {
                                ingredient: true
                            }
                        }
                    }
                },
                products: true
            }
        });

        if (!batch) {
            console.log('❌ Batch not found');
            return;
        }

        console.log('📋 Batch details:', {
            id: batch.id,
            batchNumber: batch.batchNumber,
            status: batch.status,
            actualYield: batch.actualYield,
            expectedYield: batch.recipe?.expectedYield,
            startDate: batch.startDate,
            endDate: batch.endDate,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt
        });

        console.log('📊 Recipe details:', {
            id: batch.recipe?.id,
            name: batch.recipe?.name,
            expectedYield: batch.recipe?.expectedYield,
            ingredientCount: batch.recipe?.ingredients?.length
        });

        console.log('🧪 Measurements:', batch.measurements);

        console.log('📦 Products from this batch:',
            batch.products?.map(p => ({
                id: p.id,
                name: p.name,
                quantity: p.quantity
            }))
        );

        // Check if yield might be calculated from products
        const totalProductQuantity = batch.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
        console.log('\n🧮 Yield Analysis:');
        console.log(`  Actual Yield: ${batch.actualYield} kg`);
        console.log(`  Expected Yield: ${batch.recipe?.expectedYield} kg`);
        console.log(`  Total Product Quantity: ${totalProductQuantity} kg`);
        console.log(`  Difference from Expected: ${batch.actualYield - (batch.recipe?.expectedYield || 0)} kg`);
        console.log(`  Yield Efficiency: ${((batch.actualYield / (batch.recipe?.expectedYield || 1)) * 100).toFixed(2)}%`);

        // Check if the yield matches any calculation
        console.log('\n🔍 Possible Yield Sources:');
        console.log(`  1. Manual Entry: ${batch.actualYield} kg`);
        console.log(`  2. Product Sum: ${totalProductQuantity} kg`);
        console.log(`  3. Recipe Expected: ${batch.recipe?.expectedYield} kg`);

        // Check recipe ingredients total
        const totalIngredientQuantity = batch.recipe?.ingredients?.reduce((sum, ri) => sum + (ri.quantity || 0), 0) || 0;
        console.log(`  4. Recipe Ingredients Total: ${totalIngredientQuantity} kg`);

        // Check if it's a percentage of ingredients
        if (totalIngredientQuantity > 0) {
            const yieldPercentage = (batch.actualYield / totalIngredientQuantity) * 100;
            console.log(`  5. Yield as % of ingredients: ${yieldPercentage.toFixed(2)}%`);
        }

        // The specific value analysis
        console.log('\n🎯 Specific Value Analysis:');
        console.log(`  Exact value: ${batch.actualYield}`);
        console.log(`  Rounded to 2 decimals: ${Math.round(batch.actualYield * 100) / 100}`);
        console.log(`  This precision suggests: ${batch.actualYield.toString().includes('.') ? 'Calculated value or precise measurement' : 'Whole number entry'}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugBatchYield();