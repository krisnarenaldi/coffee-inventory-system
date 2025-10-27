import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing data
  await prisma.activityLog.deleteMany()
  await prisma.inventoryAdjustment.deleteMany()
  await prisma.recipeIngredient.deleteMany()
  await prisma.product.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.packagingType.deleteMany()
  await prisma.storageLocation.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.tenantSetting.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.subscriptionPlan.deleteMany()

  // Create subscription plans
  const basicPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Basic',
      description: 'Perfect for small coffee shops',
      price: 29.99,
      interval: 'MONTHLY',
      maxUsers: 5,
      maxIngredients: 100,
      maxBatches: 50,
      features: {
        inventory: true,
        recipes: true,
        batches: true,
        basicReports: true,
        emailSupport: true,
      },
      isActive: true,
    },
  })

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Professional',
      description: 'For growing coffee businesses',
      price: 79.99,
      interval: 'MONTHLY',
      maxUsers: 15,
      maxIngredients: 500,
      maxBatches: 200,
      features: {
        inventory: true,
        recipes: true,
        batches: true,
        basicReports: true,
        advancedReports: true,
        emailSupport: true,
        prioritySupport: true,
      },
      isActive: true,
    },
  })

  // Create tenants
  const coffeeCentralTenant = await prisma.tenant.create({
    data: {
      name: 'Coffee Central',
      subdomain: 'coffee-central',
      domain: 'coffeecentral.com',
      status: 'ACTIVE',
    },
  })

  const brewMastersTenant = await prisma.tenant.create({
    data: {
      name: 'Brew Masters',
      subdomain: 'brew-masters',
      status: 'ACTIVE',
    },
  })

  // Create subscriptions
  await prisma.subscription.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  await prisma.subscription.create({
    data: {
      tenantId: brewMastersTenant.id,
      planId: basicPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // Create users
  const hashedPassword = await hash('password123', 12)

  const adminUser = await prisma.user.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      email: 'admin@coffeecentral.com',
      name: 'John Admin',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      email: 'manager@coffeecentral.com',
      name: 'Mike Manager',
      password: hashedPassword,
      role: 'MANAGER',
      emailVerified: new Date(),
    },
  })

  const staffUser = await prisma.user.create({
    data: {
      tenantId: brewMastersTenant.id,
      email: 'staff@brewmasters.com',
      name: 'Emma Staff',
      password: hashedPassword,
      role: 'STAFF',
      emailVerified: new Date(),
    },
  })

  // Create suppliers
  const greenBeanSupplier = await prisma.supplier.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'Premium Green Beans Co.',
      email: 'orders@premiumgreenbeans.com',
      phone: '+1-555-0123',
      address: '123 Coffee Street, Bean City, BC 12345',
      contactPerson: 'Robert Green',
      isActive: true,
    },
  })

  const packagingSupplier = await prisma.supplier.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'EcoPack Solutions',
      email: 'sales@ecopack.com',
      phone: '+1-555-0456',
      address: '456 Packaging Ave, Pack Town, PT 67890',
      contactPerson: 'Lisa Package',
      isActive: true,
    },
  })

  // Create storage locations
  const warehouse = await prisma.storageLocation.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'Main Warehouse',
      description: 'Primary storage facility',
      capacity: 10000,
      isActive: true,
    },
  })

  const roastingRoom = await prisma.storageLocation.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'Roasting Room',
      description: 'Temperature-controlled roasting area',
      capacity: 2000,
      isActive: true,
    },
  })

  // Create packaging types
  const bagPackaging = await prisma.packagingType.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: '12oz Bag',
      description: 'Standard 12oz coffee bag',
      isActive: true,
    },
  })

  const bulkPackaging = await prisma.packagingType.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: '5lb Bulk Bag',
      description: 'Bulk packaging for wholesale',
      isActive: true,
    },
  })

  // Create ingredients (green coffee beans)
  const ethiopianBeans = await prisma.ingredient.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'Ethiopian Yirgacheffe',
      type: 'COFFEE_BEANS',
      stockQuantity: 250,
      unitOfMeasure: 'kg',
      minimumThreshold: 50,
      costPerUnit: 8.50,
      supplierId: greenBeanSupplier.id,
      location: 'Warehouse A-1',
      expirationDate: new Date('2025-01-15'),
      isActive: true,
    },
  })

  const colombianBeans = await prisma.ingredient.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'Colombian Supremo',
      type: 'COFFEE_BEANS',
      stockQuantity: 180,
      unitOfMeasure: 'kg',
      minimumThreshold: 30,
      costPerUnit: 7.25,
      supplierId: greenBeanSupplier.id,
      location: 'Warehouse A-2',
      expirationDate: new Date('2025-01-20'),
      isActive: true,
    },
  })

  const guatemalanBeans = await prisma.ingredient.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'Guatemalan Antigua',
      type: 'COFFEE_BEANS',
      stockQuantity: 120,
      unitOfMeasure: 'kg',
      minimumThreshold: 25,
      costPerUnit: 9.00,
      supplierId: greenBeanSupplier.id,
      location: 'Warehouse A-3',
      expirationDate: new Date('2025-01-25'),
      isActive: true,
    },
  })

  // Create recipes
  const houseBlendRecipe = await prisma.recipe.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'House Blend',
      style: 'Medium Roast Blend',
      description: 'Our signature house blend with balanced flavor profile',
      expectedYield: 10,
      processInstructions: 'Roast to medium level (first crack + 2 minutes). Cool quickly and rest for 24 hours before packaging.',
      isActive: true,
    },
  })

  const singleOriginRecipe = await prisma.recipe.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      name: 'Ethiopian Single Origin',
      style: 'Light Roast Single Origin',
      description: 'Pure Ethiopian Yirgacheffe showcasing origin characteristics',
      expectedYield: 5,
      processInstructions: 'Light roast to preserve floral notes. Roast until just after first crack. Cool immediately.',
      isActive: true,
    },
  })

  // Create recipe ingredients
  await prisma.recipeIngredient.create({
    data: {
      recipeId: houseBlendRecipe.id,
      ingredientId: ethiopianBeans.id,
      quantity: 4,
      unit: 'kg',
      notes: '40% of blend',
    },
  })

  await prisma.recipeIngredient.create({
    data: {
      recipeId: houseBlendRecipe.id,
      ingredientId: colombianBeans.id,
      quantity: 3,
      unit: 'kg',
      notes: '30% of blend',
    },
  })

  await prisma.recipeIngredient.create({
    data: {
      recipeId: houseBlendRecipe.id,
      ingredientId: guatemalanBeans.id,
      quantity: 3,
      unit: 'kg',
      notes: '30% of blend',
    },
  })

  await prisma.recipeIngredient.create({
    data: {
      recipeId: singleOriginRecipe.id,
      ingredientId: ethiopianBeans.id,
      quantity: 5,
      unit: 'kg',
      notes: '100% Ethiopian beans',
    },
  })

  // Create batches
  const houseBlendBatch = await prisma.batch.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      recipeId: houseBlendRecipe.id,
      batchNumber: 'HB-2024-001',
      status: 'COMPLETED',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-15'),
      actualYield: 9.8,
      notes: 'Excellent batch with balanced flavor profile',
      createdById: managerUser.id,
    },
  })

  const ethiopianBatch = await prisma.batch.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      recipeId: singleOriginRecipe.id,
      batchNumber: 'ETH-2024-001',
      status: 'COMPLETED',
      startDate: new Date('2024-01-20'),
      endDate: new Date('2024-01-20'),
      actualYield: 4.9,
      notes: 'Light roast with excellent floral notes',
      createdById: managerUser.id,
    },
  })

  // Create products
  const houseBlendProduct = await prisma.product.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      batchId: houseBlendBatch.id,
      name: 'House Blend Coffee',
      packagingTypeId: bagPackaging.id,
      packagingDate: new Date('2024-01-16'),
      lotNumber: 'HB-LOT-001',
      quantity: 200,
      shelfLife: 365,
      storageLocation: 'Finished Goods A-1',
      status: 'IN_STOCK',
    },
  })

  const ethiopianProduct = await prisma.product.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      batchId: ethiopianBatch.id,
      name: 'Ethiopian Yirgacheffe Single Origin',
      packagingTypeId: bagPackaging.id,
      packagingDate: new Date('2024-01-21'),
      lotNumber: 'ETH-LOT-001',
      quantity: 75,
      shelfLife: 365,
      storageLocation: 'Finished Goods A-2',
      status: 'IN_STOCK',
    },
  })

  // Create some activity logs
  await prisma.activityLog.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      userId: adminUser.id,
      activityType: 'USER_LOGIN',
      severity: 'LOW',
      description: 'User logged in',
      metadata: {},
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      ipAddress: '192.168.1.100',
    },
  })

  await prisma.activityLog.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      userId: managerUser.id,
      activityType: 'RECIPE_CREATED',
      severity: 'MEDIUM',
      description: 'New recipe created: House Blend',
      metadata: { recipeId: houseBlendRecipe.id, recipeName: 'House Blend' },
      resourceId: houseBlendRecipe.id,
      resourceType: 'RECIPE',
    },
  })

  await prisma.activityLog.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      userId: managerUser.id,
      activityType: 'INVENTORY_ADJUSTMENT',
      severity: 'MEDIUM',
      description: 'Stock level adjusted for Ethiopian Yirgacheffe',
      metadata: { 
        ingredientId: ethiopianBeans.id, 
        oldStock: 200, 
        newStock: 250, 
        adjustment: 50 
      },
      resourceId: ethiopianBeans.id,
      resourceType: 'INGREDIENT',
    },
  })

  // Create inventory adjustments
  await prisma.inventoryAdjustment.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      ingredientId: ethiopianBeans.id,
      type: 'INCREASE',
      quantity: 50,
      reason: 'New shipment received',
      createdById: managerUser.id,
    },
  })

  await prisma.inventoryAdjustment.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      ingredientId: colombianBeans.id,
      type: 'DECREASE',
      quantity: 20,
      reason: 'Used in production batch',
      createdById: managerUser.id,
    },
  })

  // Create tenant settings
  await prisma.tenantSetting.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      key: 'DEFAULT_CURRENCY',
      value: 'USD',
    },
  })

  await prisma.tenantSetting.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      key: 'LOW_STOCK_THRESHOLD',
      value: '10',
    },
  })

  await prisma.tenantSetting.create({
    data: {
      tenantId: coffeeCentralTenant.id,
      key: 'EMAIL_NOTIFICATIONS',
      value: 'true',
    },
  })

  console.log('✅ Database seeding completed successfully!')
  console.log(`
📊 Seeded data summary:
- 2 Subscription plans
- 2 Tenants (Coffee Central, Brew Masters)
- 4 Users with different roles
- 2 Suppliers
- 2 Storage locations
- 2 Packaging types
- 3 Ingredients (coffee beans)
- 2 Batches
- 2 Recipes with ingredients
- 2 Products
- 3 Activity logs
- 2 Inventory adjustments
- 3 Tenant settings

🔐 Test login credentials:
- admin@coffeecentral.com / password123 (Admin)
- manager@coffeecentral.com / password123 (Manager)
- brewmaster@coffeecentral.com / password123 (Brewmaster)
- staff@brewmasters.com / password123 (Staff)
  `)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
