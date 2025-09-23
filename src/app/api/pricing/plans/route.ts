import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import {
  getCachedOrFetch,
  CacheKeys,
  CacheTTL,
} from "../../../../../lib/cache";
import {
  createCachedResponse,
  CacheConfigs,
} from "../../../../../lib/cache-headers";

// GET /api/pricing/plans - Get available subscription plans for pricing page (public)
export async function GET(request: NextRequest) {
  try {
    // Cache subscription plans for 15 minutes (they don't change often)
    const plans = await getCachedOrFetch(
      CacheKeys.subscriptionPlans(),
      async () => {
        const rawPlans = await prisma.subscriptionPlan.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            interval: true,
            maxUsers: true,
            maxIngredients: true,
            maxBatches: true,
            maxStorageLocations: true,
            maxRecipes: true,
            maxProducts: true,
            features: true,
          },
          orderBy: {
            price: "asc",
          },
        });

        // Convert Decimal price to number for frontend compatibility
        return rawPlans.map((plan) => ({
          ...plan,
          price: Number(plan.price),
        }));
      },
      CacheTTL.LONG // 15 minutes cache for subscription plans
    );

    return createCachedResponse(plans, CacheConfigs.pricingCache);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
