import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { checkFeatureAccess } from "../../../../../lib/subscription-limits";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const feature = searchParams.get("feature");

    if (!feature) {
      return NextResponse.json(
        { error: "Feature parameter is required" },
        { status: 400 }
      );
    }

    const hasAccess = await checkFeatureAccess(session.user.tenantId, feature);

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error("Error checking feature access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { features } = await request.json();

    if (!Array.isArray(features)) {
      return NextResponse.json(
        { error: "Features must be an array" },
        { status: 400 }
      );
    }

    const featureAccess: Record<string, boolean> = {};
    
    for (const feature of features) {
      featureAccess[feature] = await checkFeatureAccess(session.user.tenantId, feature);
    }

    return NextResponse.json({ features: featureAccess });
  } catch (error) {
    console.error("Error checking multiple feature access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}