const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const tenantId = "cmgj45jr70001ffel4xpzodzr";

async function ensureTenant() {
  let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: "Dummy Coffee Co",
        subdomain: "cmgj45jr-dummy",
        status: "ACTIVE",
      },
    });
    console.log("Created tenant:", tenant.id);
  } else {
    console.log("Found tenant:", tenant.id);
  }
  return tenant;
}

async function ensureUser() {
  const email = "dummy@cmgj.local";
  let user = await prisma.user.findFirst({ where: { tenantId, email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name: "Dummy Admin",
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("Created user:", user.id);
  } else {
    console.log("Found user:", user.id);
  }
  return user;
}

async function createIngredients() {
  const ingredientTypes = [
    "COFFEE_BEANS",
    "MILK",
    "SUGAR",
    "SYRUP",
    "PASTRY",
    "PACKAGING",
    "OTHER",
  ];

  const created = [];
  for (let i = 0; i < 8; i++) {
    const type = ingredientTypes[i % ingredientTypes.length];
    const ing = await prisma.ingredient.create({
      data: {
        tenantId,
        name: `Ingredient ${i + 1}`,
        type,
        stockQuantity: 10 + i,
        unitOfMeasure: i % 2 === 0 ? "kg" : "liter",
        minimumThreshold: 2,
        costPerUnit: 5 + i,
        location: i % 2 === 0 ? "Main Storage" : "Cold Room",
        batchNumber: `ING-${i + 1}`,
        expirationDate: new Date(Date.now() + (30 + i) * 24 * 60 * 60 * 1000),
      },
    });
    created.push(ing);
  }
  console.log(`Created ${created.length} ingredients`);
  return created;
}

async function createRecipes() {
  const created = [];
  for (let i = 0; i < 8; i++) {
    const rec = await prisma.recipe.create({
      data: {
        tenantId,
        name: `Recipe ${i + 1}`,
        style: i % 2 === 0 ? "Espresso" : "Cold Brew",
        description: "Dummy recipe for testing",
        expectedYield: 20 + i,
        processInstructions: "Brew and package accordingly.",
        version: 1,
        isActive: true,
      },
    });
    created.push(rec);
  }
  console.log(`Created ${created.length} recipes`);
  return created;
}

async function createBatches(recipes, user) {
  const created = [];
  for (let i = 0; i < 8; i++) {
    const rec = recipes[i % recipes.length];
    const batch = await prisma.batch.create({
      data: {
        tenantId,
        recipeId: rec.id,
        batchNumber: `BATCH-${i + 1}`,
        status: i % 3 === 0 ? "IN_PROGRESS" : "PLANNED",
        startDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        endDate: i % 3 === 0 ? new Date() : null,
        actualYield: i % 3 === 0 ? 18 + i : null,
        measurements: { ph: 6.5 + i * 0.1, tempC: 92 + i },
        notes: "Dummy batch for testing",
        createdById: user.id,
      },
    });
    created.push(batch);
  }
  console.log(`Created ${created.length} batches`);
  return created;
}

async function createProducts(batches) {
  const created = [];
  for (let i = 0; i < 8; i++) {
    const batch = batches[i % batches.length];
    const prod = await prisma.product.create({
      data: {
        tenantId,
        batchId: batch.id,
        name: `Product ${i + 1}`,
        packagingDate: new Date(),
        lotNumber: `LOT-${i + 1}`,
        quantity: 50 + i * 5,
        shelfLife: 180,
        storageLocation: i % 2 === 0 ? "Warehouse A" : "Warehouse B",
        status: "IN_STOCK",
      },
    });
    created.push(prod);
  }
  console.log(`Created ${created.length} products`);
  return created;
}

async function main() {
  try {
    console.log("🚀 Seeding dummy data for tenant:", tenantId);
    await ensureTenant();
    const user = await ensureUser();
    const ingredients = await createIngredients();
    const recipes = await createRecipes();
    const batches = await createBatches(recipes, user);
    const products = await createProducts(batches);

    console.log("✅ Done. Summary:");
    console.log({
      tenantId,
      ingredients: ingredients.length,
      recipes: recipes.length,
      batches: batches.length,
      products: products.length,
    });
  } catch (error) {
    console.error("❌ Error seeding dummy data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();