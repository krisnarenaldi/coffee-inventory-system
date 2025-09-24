import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("🔍 FIND TENANT: Looking up tenant for email:", email);

    // Find user by email and get their tenant
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true,
          }
        }
      }
    });

    if (!user || !user.tenant) {
      console.log("❌ FIND TENANT: No active user or tenant found for:", email);
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    if (user.tenant.status !== "ACTIVE") {
      console.log("❌ FIND TENANT: Tenant is not active:", user.tenant.status);
      return NextResponse.json(
        { error: "Your workspace is currently inactive" },
        { status: 403 }
      );
    }

    console.log("✅ FIND TENANT: Found tenant:", user.tenant.subdomain);

    return NextResponse.json({
      success: true,
      tenantSubdomain: user.tenant.subdomain,
      tenantName: user.tenant.name,
    });

  } catch (error) {
    console.error("❌ FIND TENANT: Error:", error);
    return NextResponse.json(
      { error: "Unable to find workspace" },
      { status: 500 }
    );
  }
}
