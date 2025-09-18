import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import {
  getSubscriptionMessage,
  validateSubscription,
} from "../../../../../lib/subscription-validation";
import { prisma } from "../../../../../lib/prisma";

// GET /api/subscription/status - Get subscription status message
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 SUBSCRIPTION STATUS: Starting request");

    const session = await getServerSession(authOptions);
    console.log("🔍 SUBSCRIPTION STATUS: Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      hasTenantId: !!session?.user?.tenantId,
      tenantId: session?.user?.tenantId,
    });

    if (!session?.user?.id || !session?.user?.tenantId) {
      console.log(
        "❌ SUBSCRIPTION STATUS: Unauthorized - missing session or tenant"
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    console.log(
      "🔍 SUBSCRIPTION STATUS: Getting message for tenant:",
      tenantId
    );

    const message = await getSubscriptionMessage(tenantId);
    console.log("✅ SUBSCRIPTION STATUS: Message retrieved:", message);

    return NextResponse.json({
      message,
      tenantId,
    });
  } catch (error) {
    console.error("❌ SUBSCRIPTION STATUS: Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/subscription/status - Check subscription status for sign-in
export async function POST(request: NextRequest) {
  try {
    const { email, tenantSubdomain } = await request.json();

    if (!email || !tenantSubdomain) {
      return NextResponse.json(
        { error: "Email and tenant subdomain are required" },
        { status: 400 }
      );
    }

    // Find the tenant by subdomain
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSubdomain },
      select: { id: true, name: true, status: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Find the user by email and tenant
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        tenantId: tenant.id,
        isActive: true,
      },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check subscription status
    const subscriptionStatus = await validateSubscription(user.tenantId);

    return NextResponse.json({
      isExpired: !subscriptionStatus.isActive,
      isActive: subscriptionStatus.isActive,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
    });
  } catch (error) {
    console.error("Error checking subscription status for sign-in:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
