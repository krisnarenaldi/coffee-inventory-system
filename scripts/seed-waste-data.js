Iconst { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedWasteData() {
    try {
        // Use the specific tenant ID
        const tenantId = 'cmh9vtq9400036mxe219kfwqr';

        // Get the tenant and user for testing
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        const user = await prisma.user.findFirst({
            where: { tenantId: tenantId }
        });

        if (!tenant) {
            console.log(`❌ Tenant with ID ${tenantId} not found.`);
            return;
        }

        if (!user) {
            console.log(`❌ No user found for tenant ${tenantId}.`);
            return;
        }

        // Get some ingredients
        const ingredients = await prisma.ingredient.findMany({
            where: { tenantId: tenantId },
            take: 5
        });

        if (ingredients.length === 0) {
            console.log(`❌ No ingredients found for tenant ${tenantId}. Please run the main seed first.`);
            return;
        }

        console.log(`📦 Found ${ingredients.length} ingredients for testing`);
        ingredients.forEach((ing, i) => {
            console.log(`  ${i + 1}. ${ing.name} (${ing.id})`);
        });

        console.log(`🌱 Seeding waste data for tenant: ${tenant.name}`);

        // Create various types of waste movements
        const wasteMovements = [
            // Production waste
            {
                tenantId: tenantId,
                ingredientId: ingredients[0].id,
                type: 'WASTE',
                quantity: -2.5,
                notes: 'Spilled during roasting process',
                createdById: user.id,
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
            },
            {
                tenantId: tenantId,
                ingredientId: ingredients[1].id,
                type: 'WASTE',
                quantity: -1.2,
                notes: 'Production spillage during transfer',
                createdById: user.id,
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            },
            // Quality control waste
            {
                tenantId: tenantId,
                ingredientId: ingredients[2].id,
                type: 'WASTE',
                quantity: -3.8,
                notes: 'Quality control reject - defective beans',
                createdById: user.id,
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            },
            {
                tenantId: tenantId,
                ingredientId: ingredients[0].id,
                type: 'WASTE',
                quantity: -0.8,
                notes: 'Quality issue - moldy beans detected',
                createdById: user.id,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            },
            // Expiration waste
            {
                tenantId: tenantId,
                ingredientId: ingredients[3].id,
                type: 'WASTE',
                quantity: -5.0,
                notes: 'Expired inventory - past use by date',
                createdById: user.id,
                createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
            },
            // Process waste
            {
                tenantId: tenantId,
                ingredientId: ingredients[4].id,
                type: 'WASTE',
                quantity: -1.5,
                notes: 'Process loss during roasting - over-roasted',
                createdById: user.id,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            },
            {
                tenantId: tenantId,
                ingredientId: ingredients[1].id,
                type: 'WASTE',
                quantity: -2.2,
                notes: 'Roasting loss - temperature control issue',
                createdById: user.id,
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            },
        ];

        // Create the waste movements
        for (const movement of wasteMovements) {
            await prisma.inventoryMovement.create({
                data: movement
            });
            console.log(`✅ Created waste movement: ${movement.notes}`);
        }

        // Update some ingredients to have expired dates for expiration waste testing
        await prisma.ingredient.updateMany({
            where: {
                tenantId: tenantId,
                id: { in: [ingredients[2].id, ingredients[3].id] }
            },
            data: {
                expirationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                stockQuantity: 2.5 // Some remaining stock that's expired
            }
        });

        console.log('🎉 Waste data seeding completed!');
        console.log(`📊 Created ${wasteMovements.length} waste movements`);
        console.log('🗑️ Updated ingredients with expiration dates for testing');

    } catch (error) {
        console.error('❌ Error seeding waste data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedWasteData();