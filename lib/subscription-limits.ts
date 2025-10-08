import { prisma } from "./prisma";
import { validateSubscription } from "./subscription-validation";

export interface SubscriptionLimits {
  maxUsers: number;
  maxIngredients: number;
  maxBatches: number;
  maxStorageLocations: number;
  maxRecipes: number;
  maxProducts: number;
  features: any;
}

export interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  currentUsage: number;
  limit: number;
}

export async function getSubscriptionLimits(
  tenantId: string
): Promise<SubscriptionLimits> {
  try {
    // First check if subscription is valid and not expired
    const subscriptionStatus = await validateSubscription(tenantId);

    if (!subscriptionStatus.isActive) {
      // Return minimal limits for expired/inactive subscriptions
      return {
        maxUsers: 0,
        maxIngredients: 0,
        maxBatches: 0,
        maxStorageLocations: 0,
        maxRecipes: 0,
        maxProducts: 0,
        features: [],
      };
    }

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (subscription?.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: subscription.planId },
      });

      if (plan) {
        return {
          maxUsers: plan.maxUsers || 1,
          maxIngredients: plan.maxIngredients || 10,
          maxBatches: plan.maxBatches || 5,
          maxStorageLocations: plan.maxStorageLocations || 2,
          maxRecipes: plan.maxRecipes || 3,
          maxProducts: plan.maxProducts || 5,
          features: plan.features || [],
        };
      }
    }

    // Default limits for free tier or when no subscription is found
    return {
      maxUsers: 1,
      maxIngredients: 3,
      maxBatches: 1,
      maxStorageLocations: 1,
      maxRecipes: 2,
      maxProducts: 4,
      features: [],
    };
  } catch (error) {
    console.error("Error fetching subscription limits:", error);
    // Return minimal limits on error for security
    return {
      maxUsers: 0,
      maxIngredients: 0,
      maxBatches: 0,
      maxStorageLocations: 0,
      maxRecipes: 0,
      maxProducts: 0,
      features: [],
    };
  }
}

export async function checkUserLimit(
  tenantId: string
): Promise<LimitCheckResult> {
  const limits = await getSubscriptionLimits(tenantId);
  const usage = await prisma.user.count({
    where: { tenantId },
  });

  return {
    allowed: usage < limits.maxUsers,
    message:
      usage >= limits.maxUsers
        ? `User limit of ${limits.maxUsers} reached`
        : undefined,
    currentUsage: usage,
    limit: limits.maxUsers,
  };
}

export async function checkIngredientLimit(
  tenantId: string
): Promise<LimitCheckResult> {
  const limits = await getSubscriptionLimits(tenantId);
  const usage = await prisma.ingredient.count({
    where: { tenantId, isActive: true },
  });

  return {
    allowed: usage < limits.maxIngredients,
    message:
      usage >= limits.maxIngredients
        ? `Ingredient limit of ${limits.maxIngredients} reached`
        : undefined,
    currentUsage: usage,
    limit: limits.maxIngredients,
  };
}

export async function checkBatchLimit(
  tenantId: string
): Promise<LimitCheckResult> {
  const limits = await getSubscriptionLimits(tenantId);
  const usage = await prisma.batch.count({
    where: { tenantId },
  });

  return {
    allowed: usage < limits.maxBatches,
    message:
      usage >= limits.maxBatches
        ? `Batch limit of ${limits.maxBatches} reached`
        : undefined,
    currentUsage: usage,
    limit: limits.maxBatches,
  };
}

export async function checkStorageLocationLimit(
  tenantId: string
): Promise<LimitCheckResult> {
  const limits = await getSubscriptionLimits(tenantId);
  const usage = await prisma.storageLocation.count({
    where: { tenantId },
  });

  return {
    allowed: usage < limits.maxStorageLocations,
    message:
      usage >= limits.maxStorageLocations
        ? `Storage location limit of ${limits.maxStorageLocations} reached`
        : undefined,
    currentUsage: usage,
    limit: limits.maxStorageLocations,
  };
}

export async function checkRecipeLimit(
  tenantId: string
): Promise<LimitCheckResult> {
  const limits = await getSubscriptionLimits(tenantId);
  const usage = await prisma.recipe.count({
    where: { tenantId, isActive: true },
  });

  return {
    allowed: usage < limits.maxRecipes,
    message:
      usage >= limits.maxRecipes
        ? `Recipe limit of ${limits.maxRecipes} reached`
        : undefined,
    currentUsage: usage,
    limit: limits.maxRecipes,
  };
}

export async function checkProductLimit(
  tenantId: string
): Promise<LimitCheckResult> {
  const limits = await getSubscriptionLimits(tenantId);
  const usage = await prisma.product.count({
    where: { tenantId },
  });

  return {
    allowed: usage < limits.maxProducts,
    message:
      usage >= limits.maxProducts
        ? `Product limit of ${limits.maxProducts} reached`
        : undefined,
    currentUsage: usage,
    limit: limits.maxProducts,
  };
}

export async function checkFeatureAccess(
  tenantId: string,
  feature: string
): Promise<boolean> {
  const limits = await getSubscriptionLimits(tenantId);
  const features = limits.features;

  // Handle both boolean features (new format) and string array features (legacy format)
  if (
    typeof features === "object" &&
    features !== null &&
    !Array.isArray(features)
  ) {
    // New boolean-based features format with synonym support
    const featureObj = features as Record<string, any>;

    // Support common synonyms between plan feature keys and app feature checks
    const booleanSynonyms: Record<string, string[]> = {
      // Reporting/analytics
      advancedReports: ["advancedReports", "analytics", "reportsAdvanced"],
      // Professional/advanced implicitly includes basic report capabilities
      basicReports: [
        "basicReports",
        "reports",
        "simpleReports",
        "advancedReports",
        "analytics",
      ],
      analytics: ["analytics", "advancedReports"],
      reports: ["reports", "basicReports", "advancedReports"],

      // Inventory/recipes/batches (kept for completeness with legacy keys)
      batches: ["batches", "inventory", "advancedInventory"],
      recipes: ["recipes", "simpleRecipes", "recipeManagement"],
      inventory: ["inventory", "advancedInventory"],
      qrScanning: ["qrScanning", "qr", "qr_code", "qrCode"],
      schedules: ["schedules", "schedule", "calendar"],
    };

    const keysToCheck = booleanSynonyms[feature] || [feature];
    return keysToCheck.some((key) => Boolean(featureObj[key]));
  }

  // Legacy string array format
  const featuresArray = Array.isArray(features) ? features : [];

  // Map feature keys to descriptive feature strings for legacy format
  const featureMapping: Record<string, string[]> = {
    analytics: [
      "Advanced report and analytics",
      "Basic report",
      "Advance Report & Analytics",
    ],
    basicReports: [
      "Basic report",
      "Advanced report and analytics",
      "Basic Report",
      "Advance Report & Analytics",
      "Basic Reports",
    ],
    advancedReports: [
      "Advanced report and analytics",
      "Advance Report & Analytics",
    ],
    batches: [
      "Advanced inventory management",
      "Simple recipe management",
      "Advance Inventory Management",
    ],
    recipes: ["Recipe versioning & scaling", "Simple recipe management"],
    inventory: [
      "Advanced inventory management",
      "Simple recipe management",
      "Advance Inventory Management",
    ],
    qrScanning: ["QR Code scanning"],
    schedules: ["Schedule & Calendar", "Schedules & Calendar"],
  };

  // Check if any of the mapped feature strings exist in the plan features
  const mappedFeatures = featureMapping[feature] || [];
  return mappedFeatures.some((mappedFeature) =>
    featuresArray.some(
      (planFeature: string) =>
        planFeature.toLowerCase().includes(mappedFeature.toLowerCase()) ||
        mappedFeature.toLowerCase().includes(planFeature.toLowerCase())
    )
  );
}

export async function getCurrentUsage(tenantId: string) {
  const [users, ingredients, batches, storageLocations, recipes, products] =
    await Promise.all([
      prisma.user.count({ where: { tenantId, isActive: true } }),
      prisma.ingredient.count({ where: { tenantId, isActive: true } }),
      prisma.batch.count({ where: { tenantId } }),
      prisma.storageLocation.count({ where: { tenantId, isActive: true } }),
      prisma.recipe.count({ where: { tenantId, isActive: true } }),
      prisma.product.count({ where: { tenantId } }),
    ]);

  return {
    users,
    ingredients,
    batches,
    storageLocations,
    recipes,
    products,
  };
}
