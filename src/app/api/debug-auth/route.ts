import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { validateSubscription } from "../../../../lib/subscription-validation";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, tenantSubdomain } = await request.json();
    
    console.log("🔍 DEBUG AUTH: Starting debug authentication for:", {
      email,
      hasPassword: !!password,
      tenantSubdomain
    });

    // Step 1: Find tenant
    let tenant = null;
    if (tenantSubdomain) {
      tenant = await prisma.tenant.findUnique({
        where: { subdomain: tenantSubdomain }
      });
      console.log("🏢 DEBUG AUTH: Tenant lookup result:", tenant ? `Found (${tenant.id})` : "Not found");
    }

    // Step 2: Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        ...(tenant ? { tenantId: tenant.id } : {})
      },
      include: {
        tenant: true
      }
    });

    console.log("👤 DEBUG AUTH: User lookup result:", user ? {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSubdomain: user.tenant?.subdomain,
      isActive: user.isActive,
      hasPassword: !!user.password
    } : "Not found");

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
        step: "user_lookup"
      });
    }

    // Step 3: Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password!);
    console.log("🔐 DEBUG AUTH: Password validation:", isPasswordValid);

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: "Invalid password",
        step: "password_validation"
      });
    }

    // Step 4: Check subscription
    console.log("📋 DEBUG AUTH: Checking subscription for tenant:", user.tenantId);
    const subscriptionStatus = await validateSubscription(user.tenantId);
    console.log("📋 DEBUG AUTH: Subscription status:", subscriptionStatus);

    if (!subscriptionStatus.isActive) {
      return NextResponse.json({
        success: false,
        error: "Subscription expired or inactive",
        step: "subscription_validation",
        subscriptionStatus
      });
    }

    // Step 5: Success
    console.log("✅ DEBUG AUTH: All checks passed");

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant
      },
      subscriptionStatus,
      debug: {
        tenantFound: !!tenant,
        userFound: !!user,
        passwordValid: isPasswordValid,
        subscriptionActive: subscriptionStatus.isActive
      }
    });

  } catch (error) {
    console.error("❌ DEBUG AUTH: Error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      step: "exception"
    }, { status: 500 });
  }
}
