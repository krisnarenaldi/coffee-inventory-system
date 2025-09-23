import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { validateSubscription } from "../../../../lib/subscription-validation";
import { comparePassword } from "../../../../lib/password-utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password, tenantSubdomain } = await request.json();

    const totalStartTime = Date.now();
    const timings: Record<string, number> = {};

    console.log("🚀 AUTH PERFORMANCE: Starting performance test for:", email);

    // Step 1: Tenant lookup
    let stepStartTime = Date.now();
    let tenant = null;
    if (tenantSubdomain) {
      tenant = await prisma.tenant.findUnique({
        where: { subdomain: tenantSubdomain },
      });
    }
    timings.tenantLookup = Date.now() - stepStartTime;

    // Step 2: User lookup with includes
    stepStartTime = Date.now();
    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        ...(tenant ? { tenantId: tenant.id } : {}),
      },
      include: {
        tenant: true,
      },
    });
    timings.userLookup = Date.now() - stepStartTime;

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
        timings,
      });
    }

    // Step 3: Password validation (optimized bcrypt)
    stepStartTime = Date.now();
    const isPasswordValid = await comparePassword(password, user.password!);
    timings.passwordValidation = Date.now() - stepStartTime;

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: "Invalid password",
        timings,
      });
    }

    // Step 4: Update last login
    stepStartTime = Date.now();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    timings.updateLastLogin = Date.now() - stepStartTime;

    // Step 5: Subscription validation
    stepStartTime = Date.now();
    const subscriptionStatus = await validateSubscription(user.tenantId);
    timings.subscriptionValidation = Date.now() - stepStartTime;

    // Calculate total time
    const totalTime = Date.now() - totalStartTime;

    // Performance analysis
    const analysis = {
      totalTime,
      slowestStep: Object.entries(timings).reduce((a, b) =>
        timings[a[0]] > timings[b[0]] ? a : b
      ),
      breakdown: Object.entries(timings)
        .map(([step, time]) => ({
          step,
          time,
          percentage: Math.round((time / totalTime) * 100),
        }))
        .sort((a, b) => b.time - a.time),
    };

    return NextResponse.json({
      success: true,
      timings,
      analysis,
      recommendations: generateRecommendations(timings),
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
      },
      subscriptionActive: subscriptionStatus.isActive,
    });
  } catch (error) {
    console.error("❌ AUTH PERFORMANCE: Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(timings: Record<string, number>): string[] {
  const recommendations: string[] = [];

  if (timings.passwordValidation > 200) {
    recommendations.push(
      "🔐 Password validation is slow (>200ms). Consider reducing bcrypt rounds from 12 to 10."
    );
  }

  if (timings.userLookup > 100) {
    recommendations.push(
      "👤 User lookup is slow (>100ms). Consider adding database indexes or optimizing the query."
    );
  }

  if (timings.subscriptionValidation > 100) {
    recommendations.push(
      "📋 Subscription validation is slow (>100ms). The caching should help, but consider optimizing the query."
    );
  }

  if (timings.updateLastLogin > 50) {
    recommendations.push(
      "📝 Last login update is slow (>50ms). Consider making this async or batching updates."
    );
  }

  if (timings.tenantLookup > 50) {
    recommendations.push(
      "🏢 Tenant lookup is slow (>50ms). Consider caching tenant data."
    );
  }

  const totalTime = Object.values(timings).reduce((sum, time) => sum + time, 0);
  if (totalTime > 500) {
    recommendations.push(
      "⚡ Total authentication time is >500ms. Focus on the slowest steps first."
    );
  }

  return recommendations;
}
