const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

const TENANT_ID = 'cmh8xccdo0002135i8kthf21q';

async function main() {
  console.log('Seeding dummy data...');
  
  // Create 3 suppliers
  console.log('Creating suppliers...');
  const supplier1 = await prisma.supplier.create({
    data: {
      id: `supp-${uuidv4()}`,
      tenantId: TENANT_ID,
      name: 'Premium Coffee Beans Inc.',
      contactPerson: 'John Beanmaster',
      email: 'john@premiumcoffee.com',
      phone: '+1-555-123-4567',
      address: '123 Coffee Bean St, Seattle, WA 98101',
      notes: 'Specialty coffee beans from South America',
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      id: `supp-${uuidv4()}`,
      tenantId: TENANT_ID,
      name: 'Organic Spices Co.',
      contactPerson: 'Sarah Spice',
      email: 'sarah@organicspices.com',
      phone: '+1-555-234-5678',
      address: '456 Spice Ave, Portland, OR 97201',
      notes: 'Organic and fair-trade spices',
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      id: `supp-${uuidv4()}`,
      tenantId: TENANT_ID,
      name: 'Sweet Additives Ltd.',
      contactPerson: 'Mike Sweetener',
      email: 'mike@sweetadditives.com',
      phone: '+1-555-345-6789',
      address: '789 Sweet St, San Francisco, CA 94101',
      notes: 'Specialty sweeteners and flavorings',
    },
  });

  // Create 3 ingredients
  console.log('Creating ingredients...');
  const [ingredient1, ingredient2, ingredient3] = await Promise.all([
    prisma.ingredient.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Colombian Supremo Beans',
        type: 'COFFEE_BEANS',
        stockQuantity: 100,
        unitOfMeasure: 'kg',
        minimumThreshold: 10,
        costPerUnit: 15.99,
        location: 'Warehouse A, Shelf 1',
        batchNumber: 'CB-2025-001',
        expirationDate: new Date('2026-12-31'),
        supplierId: supplier1.id,
      },
    }),
    prisma.ingredient.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Ceylon Cinnamon',
        type: 'OTHER', // Changed from SPICE to OTHER
        stockQuantity: 50,
        unitOfMeasure: 'kg',
        minimumThreshold: 5,
        costPerUnit: 25.50,
        location: 'Warehouse A, Shelf 2',
        batchNumber: 'CIN-2025-001',
        expirationDate: new Date('2026-06-30'),
        supplierId: supplier2.id,
      },
    }),
    prisma.ingredient.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Organic Vanilla Extract',
        type: 'SYRUP', // Changed from FLAVORING to SYRUP
        stockQuantity: 20,
        unitOfMeasure: 'L',
        minimumThreshold: 2,
        costPerUnit: 45.75,
        location: 'Warehouse B, Shelf 1',
        batchNumber: 'VAN-2025-001',
        expirationDate: new Date('2026-09-30'),
        supplierId: supplier3.id,
      },
    }),
  ]);

  // Create 1 recipe
  console.log('Creating recipe...');
  const recipe = await prisma.recipe.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Vanilla Cinnamon Latte',
      style: 'Specialty Coffee',
      description: 'A smooth latte with hints of vanilla and cinnamon',
      expectedYield: 1.0,
      processInstructions: 'Brew espresso, steam milk, add vanilla extract, top with cinnamon',
      version: 1,
    },
  });

  // Add ingredients to recipe
  console.log('Adding ingredients to recipe...');
  await Promise.all([
    prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient1.id,
        quantity: 0.02, // 20g of coffee
        unit: 'kg',
        notes: 'Freshly ground before brewing',
      },
    }),
    prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient2.id,
        quantity: 0.002, // 2g of cinnamon
        unit: 'kg',
        notes: 'Ground cinnamon',
      },
    }),
    prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient3.id,
        quantity: 0.005, // 5ml of vanilla extract
        unit: 'L',
        notes: 'Organic vanilla extract',
      },
    }),
  ]);

  // Get a user to associate with batches
  const user = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID },
  });

  if (!user) {
    throw new Error('No user found in the tenant. Please create a user first.');
  }

  // Create 4 batches
  console.log('Creating batches...');
  const batches = [];
  const batchNumbers = ['BATCH-001', 'BATCH-002', 'BATCH-003', 'BATCH-004'];
  const statuses = ['COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'PLANNED'];
  
  for (let i = 0; i < 4; i++) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (3 - i));
    
    const endDate = statuses[i] === 'COMPLETED' ? new Date(startDate.getTime() + 3600000) : null;
    
    const batch = await prisma.batch.create({
      data: {
        tenantId: TENANT_ID,
        recipeId: recipe.id,
        batchNumber: batchNumbers[i],
        status: statuses[i],
        startDate: startDate,
        endDate: endDate,
        actualYield: statuses[i] === 'COMPLETED' ? 10.0 : null,
        measurements: {
          ph: 6.8,
          brix: 12.5,
          tasteNotes: ['smooth', 'balanced'],
        },
        notes: `Batch #${i + 1} of ${recipe.name}`,
        createdById: user.id,
      },
    });
    batches.push(batch);
  }

  // Create 2 products
  console.log('Creating products...');
  await prisma.product.create({
    data: {
      tenantId: TENANT_ID,
      batchId: batches[0].id,
      name: 'Vanilla Cinnamon Latte - 12oz',
      packagingTypeId: null, // You might want to create packaging types and reference them here
      packagingDate: new Date(),
      lotNumber: `LOT-${batches[0].batchNumber}`,
      quantity: 100,
      shelfLife: 30,
      storageLocation: 'Cold Storage A',
      status: 'IN_STOCK',
    },
  });

  await prisma.product.create({
    data: {
      tenantId: TENANT_ID,
      batchId: batches[1].id,
      name: 'Vanilla Cinnamon Latte - 16oz',
      packagingTypeId: null, // You might want to create packaging types and reference them here
      packagingDate: new Date(),
      lotNumber: `LOT-${batches[1].batchNumber}`,
      quantity: 75,
      shelfLife: 30,
      storageLocation: 'Cold Storage B',
      status: 'IN_STOCK',
    },
  });

  console.log('✅ Dummy data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
