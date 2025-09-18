import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

// GET /api/subscription/plans - Get available subscription plans for tenants
export async function GET(request: NextRequest) {
  try {
    // Allow unauthenticated access to view available plans
    // This is needed for expired subscription users to see upgrade options
    const session = await getServerSession(authOptions);

    // Note: We don't require authentication for viewing plans
    // Users with expired subscriptions should be able to see available plans

    const plans = await prisma.subscriptionPlan.findMany({
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

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
