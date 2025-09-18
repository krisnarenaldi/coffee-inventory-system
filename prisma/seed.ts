import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create subscription plans
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { id: "free-plan" },
    update: {},
    create: {
      id: "free-plan",
      name: "Free",
      description: "Free plan for getting started",
      price: 0,
      interval: "MONTHLY",
      maxUsers: 1,
      maxIngredients: 10,
      maxBatches: 5,
      features: {
        inventory: true,
        recipes: true,
        batches: true,
        basicReports: false,
        emailSupport: false,
      },
      isActive: true,
    },
  });

  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { id: "starter-plan" },
    update: {},
    create: {
      id: "starter-plan",
      name: "Starter",
      description: "Perfect for small craft breweries",
      price: 29.99,
      interval: "MONTHLY",
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
  });

  const professionalPlan = await prisma.subscriptionPlan.upsert({
    where: { id: "professional-plan" },
    update: {},
    create: {
      id: "professional-plan",
      name: "Professional",
      description: "For growing breweries with advanced needs",
      price: 79.99,
      interval: "MONTHLY",
      maxUsers: 20,
      maxIngredients: 500,
      maxBatches: 200,
      features: {
        inventory: true,
        recipes: true,
        batches: true,
        basicReports: true,
        advancedReports: true,
        analytics: true,
        qrScanning: true,
        emailSupport: true,
        phoneSupport: true,
      },
      isActive: true,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { id: "enterprise-plan" },
    update: {},
    create: {
      id: "enterprise-plan",
      name: "Enterprise",
      description: "For large breweries with unlimited needs",
      price: 199.99,
      interval: "MONTHLY",
      maxUsers: null, // unlimited
      maxIngredients: null, // unlimited
      maxBatches: null, // unlimited
      features: {
        inventory: true,
        recipes: true,
        batches: true,
        basicReports: true,
        advancedReports: true,
        analytics: true,
        qrScanning: true,
        multiLocation: true,
        customIntegrations: true,
        dedicatedSupport: true,
        sla: true,
      },
      isActive: true,
    },
  });

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Demo Coffee Shop",
      subdomain: "demo",
      status: "ACTIVE",
    },
  });

  // Create demo subscription
  await prisma.subscription.upsert({
    where: { tenantId: demoTenant.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      planId: professionalPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  // Create demo users
  const hashedPassword = await bcrypt.hash("demo123", 12);

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: demoTenant.id,
        email: "admin@demo.com",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "admin@demo.com",
      name: "Demo Admin",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  const brewmasterUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: demoTenant.id,
        email: "barista@demo.coffeeshop",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "barista@demo.coffeeshop",
      name: "Demo Barista",
      password: hashedPassword,
      role: "BREWMASTER",
      isActive: true,
    },
  });

  // Create platform admin user
  const platformAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: demoTenant.id,
        email: "platform@coffeeshop.com",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "platform@coffeeshop.com",
      name: "Platform Admin",
      password: hashedPassword,
      role: "PLATFORM_ADMIN",
      isActive: true,
    },
  });

  // Create demo suppliers
  const coffeeSupplier = await prisma.supplier.create({
    data: {
      tenantId: demoTenant.id,
      name: "Premium Coffee Roasters",
      contactPerson: "Maria Santos",
      email: "maria@premiumcoffee.com",
      phone: "+1-555-0123",
      address: "123 Coffee Street, Jakarta, Indonesia",
      notes: "Premium coffee bean supplier with organic certification",
    },
  });

  const milkSupplier = await prisma.supplier.create({
    data: {
      tenantId: demoTenant.id,
      name: "Fresh Dairy Co.",
      contactPerson: "David Wilson",
      email: "sales@freshdairy.com",
      phone: "+1-555-0456",
      address: "456 Dairy Lane, Vermont, VT 05401",
      notes: "Organic milk and dairy products supplier",
    },
  });

  // Create demo ingredients
  await prisma.ingredient.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        name: "Arabica Coffee Beans",
        type: "COFFEE_BEANS",
        stockQuantity: 50.5,
        unitOfMeasure: "lbs",
        minimumThreshold: 20,
        costPerUnit: 8.5,
        location: "Storage A-1",
        supplierId: coffeeSupplier.id,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: demoTenant.id,
        name: "Robusta Coffee Beans",
        type: "COFFEE_BEANS",
        stockQuantity: 30.2,
        unitOfMeasure: "lbs",
        minimumThreshold: 15,
        costPerUnit: 6.0,
        location: "Storage A-2",
        supplierId: coffeeSupplier.id,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: demoTenant.id,
        name: "Whole Milk",
        type: "MILK",
        stockQuantity: 100,
        unitOfMeasure: "liters",
        minimumThreshold: 30,
        costPerUnit: 1.2,
        location: "Refrigerator B-1",
        supplierId: milkSupplier.id,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: demoTenant.id,
        name: "Oat Milk",
        type: "MILK",
        stockQuantity: 50,
        unitOfMeasure: "liters",
        minimumThreshold: 20,
        costPerUnit: 2.5,
        location: "Refrigerator B-2",
        supplierId: milkSupplier.id,
        expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: demoTenant.id,
        name: "Vanilla Syrup",
        type: "SYRUP",
        stockQuantity: 24,
        unitOfMeasure: "bottles",
        minimumThreshold: 10,
        costPerUnit: 4.5,
        location: "Storage C-1",
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Create demo recipe
  const latteRecipe = await prisma.recipe.create({
    data: {
      tenantId: demoTenant.id,
      name: "House Latte",
      style: "Espresso-based",
      description:
        "Our signature creamy latte with rich espresso and steamed milk",
      expectedYield: 12, // ounces
      processInstructions:
        "1. Grind 18g coffee beans 2. Extract double shot espresso (25-30 seconds) 3. Steam milk to 150°F 4. Pour steamed milk into espresso 5. Create latte art",
      version: 1,
    },
  });

  // Create default permissions
  const permissions = [
    // User management
    {
      name: "users.create",
      description: "Create new users",
      resource: "users",
      action: "create",
    },
    {
      name: "users.read",
      description: "View users",
      resource: "users",
      action: "read",
    },
    {
      name: "users.update",
      description: "Update user information",
      resource: "users",
      action: "update",
    },
    {
      name: "users.delete",
      description: "Delete users",
      resource: "users",
      action: "delete",
    },

    // Ingredient management
    {
      name: "ingredients.create",
      description: "Add new ingredients",
      resource: "ingredients",
      action: "create",
    },
    {
      name: "ingredients.read",
      description: "View ingredients",
      resource: "ingredients",
      action: "read",
    },
    {
      name: "ingredients.update",
      description: "Update ingredient information",
      resource: "ingredients",
      action: "update",
    },
    {
      name: "ingredients.delete",
      description: "Delete ingredients",
      resource: "ingredients",
      action: "delete",
    },

    // Recipe management
    {
      name: "recipes.create",
      description: "Create new recipes",
      resource: "recipes",
      action: "create",
    },
    {
      name: "recipes.read",
      description: "View recipes",
      resource: "recipes",
      action: "read",
    },
    {
      name: "recipes.update",
      description: "Update recipes",
      resource: "recipes",
      action: "update",
    },
    {
      name: "recipes.delete",
      description: "Delete recipes",
      resource: "recipes",
      action: "delete",
    },

    // Batch management
    {
      name: "batches.create",
      description: "Create new batches",
      resource: "batches",
      action: "create",
    },
    {
      name: "batches.read",
      description: "View batches",
      resource: "batches",
      action: "read",
    },
    {
      name: "batches.update",
      description: "Update batch information",
      resource: "batches",
      action: "update",
    },
    {
      name: "batches.delete",
      description: "Delete batches",
      resource: "batches",
      action: "delete",
    },

    // Product management
    {
      name: "products.create",
      description: "Create new products",
      resource: "products",
      action: "create",
    },
    {
      name: "products.read",
      description: "View products",
      resource: "products",
      action: "read",
    },
    {
      name: "products.update",
      description: "Update product information",
      resource: "products",
      action: "update",
    },
    {
      name: "products.delete",
      description: "Delete products",
      resource: "products",
      action: "delete",
    },

    // Reports and analytics
    {
      name: "reports.read",
      description: "View reports and analytics",
      resource: "reports",
      action: "read",
    },
    {
      name: "reports.export",
      description: "Export reports",
      resource: "reports",
      action: "export",
    },

    // Settings management
    {
      name: "settings.read",
      description: "View settings",
      resource: "settings",
      action: "read",
    },
    {
      name: "settings.update",
      description: "Update settings",
      resource: "settings",
      action: "update",
    },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((permission) =>
      prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission,
      })
    )
  );

  console.log("✅ Permissions and roles created successfully!");

  console.log("✅ Database seeded successfully!");
  console.log("Demo tenant created:", demoTenant.subdomain);
  console.log("Demo users:");
  console.log("  - Admin: admin@demo.com (password: demo123)");
  console.log("  - Barista: barista@demo.coffeeshop (password: demo123)");
  console.log(
    "  - Platform Admin: platform@coffeeshop.com (password: demo123)"
  );
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
