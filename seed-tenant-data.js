const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTenantData() {
  const tenantId = 'cmh9vtq9400036mxe219kfwqr';
  
  try {
    console.log(`🌱 Seeding data for tenant: ${tenantId}`);
    
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: { include: { plan: true } } }
    });
    
    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }
    
    console.log(`✅ Found tenant: ${tenant.name}`);
    console.log(`📋 Plan: ${tenant.subscription?.plan?.name}`);
    
    // Get the admin user for this tenant
    const adminUser = await prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN' }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`👤 Admin user: ${adminUser.name} (${adminUser.email})`);
    
    // 1. Create 4 Suppliers
    console.log('\n📦 Creating 4 suppliers...');
    const suppliers = [];
    
    const supplierData = [
      {
        name: 'Premium Coffee Beans Co.',
        email: 'orders@premiumcoffee.com',
        phone: '+62-21-555-0123',
        address: 'Jl. Kopi Raya No. 123, Jakarta Selatan',
        contactPerson: 'Budi Santoso'
      },
      {
        name: 'Arabica Direct Import',
        email: 'sales@arabicadirect.co.id',
        phone: '+62-21-555-0456',
        address: 'Jl. Arabica Street No. 45, Jakarta Pusat',
        contactPerson: 'Sari Wijaya'
      },
      {
        name: 'Packaging Solutions Indonesia',
        email: 'info@packagingsolutions.id',
        phone: '+62-21-555-0789',
        address: 'Jl. Kemasan Indah No. 67, Tangerang',
        contactPerson: 'Ahmad Rizki'
      },
      {
        name: 'Roasting Equipment Supply',
        email: 'support@roastequip.com',
        phone: '+62-21-555-0321',
        address: 'Jl. Mesin Roasting No. 89, Bekasi',
        contactPerson: 'Linda Kusuma'
      }
    ];
    
    for (const supplierInfo of supplierData) {
      const supplier = await prisma.supplier.create({
        data: {
          tenantId,
          ...supplierInfo,
          isActive: true
        }
      });
      suppliers.push(supplier);
      console.log(`  ✅ Created: ${supplier.name}`);
    }
    
    // 2. Create Storage Locations (or get existing ones)
    console.log('\n📍 Creating storage locations...');
    const storageLocations = [];
    
    const storageData = [
      { name: 'Main Warehouse', description: 'Primary storage facility', capacity: 10000 },
      { name: 'Roasting Room', description: 'Temperature-controlled roasting area', capacity: 2000 },
      { name: 'Finished Goods', description: 'Ready products storage', capacity: 5000 },
      { name: 'Cold Storage', description: 'Climate-controlled storage', capacity: 3000 }
    ];
    
    for (const storageInfo of storageData) {
      let storage = await prisma.storageLocation.findFirst({
        where: { tenantId, name: storageInfo.name }
      });
      
      if (!storage) {
        storage = await prisma.storageLocation.create({
          data: {
            tenantId,
            ...storageInfo,
            isActive: true
          }
        });
        console.log(`  ✅ Created: ${storage.name}`);
      } else {
        console.log(`  ♻️ Using existing: ${storage.name}`);
      }
      storageLocations.push(storage);
    }
    
    // 3. Create Packaging Types (or get existing ones)
    console.log('\n📦 Creating packaging types...');
    const packagingTypes = [];
    
    const packagingData = [
      { name: '250g Bag', description: 'Small retail bag' },
      { name: '500g Bag', description: 'Medium retail bag' },
      { name: '1kg Bag', description: 'Large retail bag' },
      { name: '5kg Bulk Bag', description: 'Wholesale bulk packaging' }
    ];
    
    for (const packagingInfo of packagingData) {
      let packaging = await prisma.packagingType.findFirst({
        where: { tenantId, name: packagingInfo.name }
      });
      
      if (!packaging) {
        packaging = await prisma.packagingType.create({
          data: {
            tenantId,
            ...packagingInfo,
            isActive: true
          }
        });
        console.log(`  ✅ Created: ${packaging.name}`);
      } else {
        console.log(`  ♻️ Using existing: ${packaging.name}`);
      }
      packagingTypes.push(packaging);
    }
    
    // 4. Create 20 Ingredients
    console.log('\n🌱 Creating 20 ingredients...');
    const ingredients = [];
    
    const ingredientData = [
      { name: 'Ethiopian Yirgacheffe', type: 'COFFEE_BEANS', stockQuantity: 250, unitOfMeasure: 'kg', minimumThreshold: 50, costPerUnit: 85000, location: 'Main Warehouse A-1' },
      { name: 'Colombian Supremo', type: 'COFFEE_BEANS', stockQuantity: 180, unitOfMeasure: 'kg', minimumThreshold: 30, costPerUnit: 72500, location: 'Main Warehouse A-2' },
      { name: 'Guatemalan Antigua', type: 'COFFEE_BEANS', stockQuantity: 120, unitOfMeasure: 'kg', minimumThreshold: 25, costPerUnit: 90000, location: 'Main Warehouse A-3' },
      { name: 'Brazilian Santos', type: 'COFFEE_BEANS', stockQuantity: 300, unitOfMeasure: 'kg', minimumThreshold: 60, costPerUnit: 65000, location: 'Main Warehouse A-4' },
      { name: 'Jamaican Blue Mountain', type: 'COFFEE_BEANS', stockQuantity: 50, unitOfMeasure: 'kg', minimumThreshold: 10, costPerUnit: 150000, location: 'Cold Storage B-1' },
      { name: 'Hawaiian Kona', type: 'COFFEE_BEANS', stockQuantity: 75, unitOfMeasure: 'kg', minimumThreshold: 15, costPerUnit: 125000, location: 'Cold Storage B-2' },
      { name: 'Kenyan AA', type: 'COFFEE_BEANS', stockQuantity: 140, unitOfMeasure: 'kg', minimumThreshold: 30, costPerUnit: 95000, location: 'Main Warehouse A-5' },
      { name: 'Costa Rican Tarrazú', type: 'COFFEE_BEANS', stockQuantity: 110, unitOfMeasure: 'kg', minimumThreshold: 25, costPerUnit: 88000, location: 'Main Warehouse A-6' },
      { name: 'Sumatra Mandheling', type: 'COFFEE_BEANS', stockQuantity: 160, unitOfMeasure: 'kg', minimumThreshold: 35, costPerUnit: 78000, location: 'Main Warehouse A-7' },
      { name: 'Yemen Mocha', type: 'COFFEE_BEANS', stockQuantity: 80, unitOfMeasure: 'kg', minimumThreshold: 20, costPerUnit: 110000, location: 'Cold Storage B-3' },
      { name: 'Panama Geisha', type: 'COFFEE_BEANS', stockQuantity: 40, unitOfMeasure: 'kg', minimumThreshold: 8, costPerUnit: 200000, location: 'Cold Storage B-4' },
      { name: 'Peru Organic', type: 'COFFEE_BEANS', stockQuantity: 200, unitOfMeasure: 'kg', minimumThreshold: 40, costPerUnit: 70000, location: 'Main Warehouse A-8' },
      { name: 'Mexican Chiapas', type: 'COFFEE_BEANS', stockQuantity: 130, unitOfMeasure: 'kg', minimumThreshold: 25, costPerUnit: 75000, location: 'Main Warehouse A-9' },
      { name: 'Indian Monsoon Malabar', type: 'COFFEE_BEANS', stockQuantity: 90, unitOfMeasure: 'kg', minimumThreshold: 20, costPerUnit: 82000, location: 'Main Warehouse A-10' },
      { name: 'Rwanda Bourbon', type: 'COFFEE_BEANS', stockQuantity: 100, unitOfMeasure: 'kg', minimumThreshold: 20, costPerUnit: 85000, location: 'Main Warehouse A-11' },
      { name: 'Vanilla Syrup', type: 'SYRUP', stockQuantity: 5, unitOfMeasure: 'liters', minimumThreshold: 1, costPerUnit: 250000, location: 'Cold Storage C-1' },
      { name: 'Cinnamon Sugar', type: 'SUGAR', stockQuantity: 10, unitOfMeasure: 'kg', minimumThreshold: 2, costPerUnit: 45000, location: 'Main Warehouse B-1' },
      { name: 'Cocoa Powder', type: 'OTHER', stockQuantity: 15, unitOfMeasure: 'kg', minimumThreshold: 3, costPerUnit: 35000, location: 'Main Warehouse B-2' },
      { name: 'Cardamom Syrup', type: 'SYRUP', stockQuantity: 3, unitOfMeasure: 'liters', minimumThreshold: 0.5, costPerUnit: 180000, location: 'Cold Storage C-2' },
      { name: 'Hazelnut Syrup', type: 'SYRUP', stockQuantity: 8, unitOfMeasure: 'liters', minimumThreshold: 1.5, costPerUnit: 120000, location: 'Cold Storage C-3' }
    ];
    
    for (let i = 0; i < ingredientData.length; i++) {
      const ingredientInfo = ingredientData[i];
      const supplier = suppliers[i % suppliers.length]; // Rotate through suppliers
      
      const ingredient = await prisma.ingredient.create({
        data: {
          tenantId,
          ...ingredientInfo,
          supplierId: supplier.id,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          isActive: true
        }
      });
      ingredients.push(ingredient);
      console.log(`  ✅ Created: ${ingredient.name}`);
    }
    
    // 5. Create 12 Recipes
    console.log('\n📋 Creating 12 recipes...');
    const recipes = [];
    
    const recipeData = [
      { name: 'House Blend', style: 'Medium Roast Blend', description: 'Our signature house blend with balanced flavor', expectedYield: 10, instructions: 'Roast to medium level (first crack + 2 minutes)' },
      { name: 'Ethiopian Single Origin', style: 'Light Roast Single Origin', description: 'Pure Ethiopian Yirgacheffe showcasing origin characteristics', expectedYield: 5, instructions: 'Light roast to preserve floral notes' },
      { name: 'Dark Roast Espresso', style: 'Dark Roast Blend', description: 'Bold espresso blend for strong coffee lovers', expectedYield: 8, instructions: 'Dark roast until second crack begins' },
      { name: 'Colombian Premium', style: 'Medium Roast Single Origin', description: 'Premium Colombian beans with chocolate notes', expectedYield: 6, instructions: 'Medium roast to develop sweetness' },
      { name: 'Breakfast Blend', style: 'Light-Medium Roast Blend', description: 'Perfect morning coffee with bright acidity', expectedYield: 12, instructions: 'Light-medium roast for balanced flavor' },
      { name: 'Decaf House Blend', style: 'Medium Roast Decaf', description: 'Decaffeinated version of our house blend', expectedYield: 8, instructions: 'Medium roast, careful temperature control' },
      { name: 'Guatemalan Specialty', style: 'Medium-Dark Roast Single Origin', description: 'Rich Guatemalan beans with full body', expectedYield: 7, instructions: 'Medium-dark roast for body development' },
      { name: 'Organic Fair Trade', style: 'Medium Roast Organic', description: 'Certified organic and fair trade blend', expectedYield: 9, instructions: 'Medium roast preserving organic qualities' },
      { name: 'Seasonal Holiday Blend', style: 'Medium Roast Spiced', description: 'Special holiday blend with warming spices', expectedYield: 10, instructions: 'Medium roast with spice addition post-roast' },
      { name: 'Cold Brew Concentrate', style: 'Dark Roast Cold Brew', description: 'Specially roasted for cold brew preparation', expectedYield: 15, instructions: 'Dark roast for cold extraction' },
      { name: 'Espresso Romano', style: 'Dark Roast Espresso', description: 'Italian-style espresso with citrus notes', expectedYield: 6, instructions: 'Dark roast with precise timing' },
      { name: 'Mocha Java Blend', style: 'Medium-Dark Roast Blend', description: 'Classic mocha java combination', expectedYield: 8, instructions: 'Medium-dark roast for chocolate notes' }
    ];
    
    for (let i = 0; i < recipeData.length; i++) {
      const recipeInfo = recipeData[i];
      
      const recipe = await prisma.recipe.create({
        data: {
          tenantId,
          name: recipeInfo.name,
          style: recipeInfo.style,
          description: recipeInfo.description,
          expectedYield: recipeInfo.expectedYield,
          processInstructions: recipeInfo.instructions,
          isActive: true
        }
      });
      recipes.push(recipe);
      
      // Add 2-3 ingredients to each recipe
      const recipeIngredients = ingredients.filter(ing => ing.type === 'COFFEE_BEANS').slice(0, 2 + (i % 2));
      for (let j = 0; j < recipeIngredients.length; j++) {
        const ingredient = recipeIngredients[j];
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: 2 + (j * 1.5),
            unit: 'kg',
            notes: `${Math.round((2 + j * 1.5) / recipeInfo.expectedYield * 100)}% of blend`
          }
        });
      }
      
      console.log(`  ✅ Created: ${recipe.name} (${recipeIngredients.length} ingredients)`);
    }
    
    // 6. Create 7 Batches
    console.log('\n☕ Creating 7 batches...');
    const batches = [];
    
    for (let i = 0; i < 7; i++) {
      const recipe = recipes[i % recipes.length];
      const batchNumber = `BATCH-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`;
      
      const batch = await prisma.batch.create({
        data: {
          tenantId,
          recipeId: recipe.id,
          batchNumber,
          status: i < 5 ? 'COMPLETED' : 'IN_PROGRESS',
          startDate: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
          endDate: i < 5 ? new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000) : null,
          actualYield: i < 5 ? recipe.expectedYield * (0.9 + Math.random() * 0.2) : null,
          notes: `Batch ${i + 1} - ${i < 5 ? 'Completed successfully' : 'In progress'}`,
          createdById: adminUser.id
        }
      });
      batches.push(batch);
      console.log(`  ✅ Created: ${batch.batchNumber} (${batch.status})`);
    }
    
    // 7. Create 5 Products
    console.log('\n🛍️ Creating 5 products...');
    const completedBatches = batches.filter(b => b.status === 'COMPLETED');
    
    for (let i = 0; i < 5; i++) {
      const batch = completedBatches[i % completedBatches.length];
      const packaging = packagingTypes[i % packagingTypes.length];
      const storage = storageLocations[2]; // Finished Goods storage
      
      const product = await prisma.product.create({
        data: {
          tenantId,
          batchId: batch.id,
          name: `${batch.recipe?.name || 'Coffee'} - ${packaging.name}`,
          packagingTypeId: packaging.id,
          packagingDate: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
          lotNumber: `LOT-${batch.batchNumber}-${String(i + 1).padStart(2, '0')}`,
          quantity: 50 + (i * 25),
          shelfLife: 365,
          storageLocation: storage.name,
          status: 'IN_STOCK'
        }
      });
      console.log(`  ✅ Created: ${product.name} (${product.quantity} units)`);
    }
    
    console.log('\n🎉 Seeding completed successfully!');
    console.log(`
📊 Summary:
- 4 Suppliers created
- 4 Storage locations created  
- 4 Packaging types created
- 20 Ingredients created
- 12 Recipes created (with recipe ingredients)
- 7 Batches created
- 5 Products created

✅ Tenant ${tenant.name} now has comprehensive demo data!
    `);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTenantData();