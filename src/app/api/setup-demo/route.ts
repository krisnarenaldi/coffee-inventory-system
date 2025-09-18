import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

async function createDemoSubscription(tenantId: string) {
  // Check if subscription already exists
  const existingSubscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (existingSubscription) {
    console.log("Subscription already exists for tenant:", tenantId);
    return existingSubscription;
  }

  // Find or create a demo subscription plan
  let demoPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Premium Plan" },
  });

  if (!demoPlan) {
    // Create a demo plan if it doesn't exist
    demoPlan = await prisma.subscriptionPlan.create({
      data: {
        name: "Premium Plan",
        description: "Full access to all features",
        price: 29.99,
        interval: "MONTHLY",
        maxUsers: 50,
        maxIngredients: 1000,
        maxBatches: 500,
        maxStorageLocations: 20,
        maxProducts: 200,
        features: {
          reports: true,
          analytics: true,
          api_access: true,
          priority_support: true,
        },
        isActive: true,
      },
    });
  }

  // Create subscription with a future end date
  const now = new Date();
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now

  const subscription = await prisma.subscription.create({
    data: {
      tenantId,
      planId: demoPlan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: futureDate,
      cancelAtPeriodEnd: false,
    },
  });

  console.log("Created subscription for tenant:", tenantId);
  return subscription;
}

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with a secret key
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (
      process.env.NODE_ENV === "production" &&
      secret !== "setup-demo-user-2024"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, find or create a demo tenant
    let demoTenant = await prisma.tenant.findUnique({
      where: { subdomain: "demo" },
    });

    if (!demoTenant) {
      console.log("Creating demo tenant...");
      demoTenant = await prisma.tenant.create({
        data: {
          name: "Demo Coffee Company",
          subdomain: "demo",
          status: "ACTIVE",
          planType: "PREMIUM",
        },
      });
    }

    // Check if admin@demo.com user exists for this tenant
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: demoTenant.id,
          email: "admin@demo.com",
        },
      },
    });

    if (existingUser) {
      // Also ensure subscription exists for existing user
      await createDemoSubscription(demoTenant.id);

      return NextResponse.json({
        message: "Demo user already exists, subscription verified",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          tenant: demoTenant.name,
        },
      });
    }

    // Create the demo user
    const hashedPassword = await bcrypt.hash("demo123", 12);

    const newUser = await prisma.user.create({
      data: {
        email: "admin@demo.com",
        name: "Demo Admin",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
        tenantId: demoTenant.id,
      },
    });

    // Also create a subscription for the demo tenant
    await createDemoSubscription(demoTenant.id);

    return NextResponse.json({
      message: "Demo user and subscription created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        tenant: demoTenant.name,
      },
    });
  } catch (error) {
    console.error("Setup demo error:", error);
    return NextResponse.json(
      {
        error: "Failed to setup demo user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
