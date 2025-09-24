import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { comparePassword } from "../../../../lib/password-utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("🧪 TEST LOGIN: Starting test for:", email);
    
    // Step 1: Find user by email (main domain logic)
    const userWithTenant = await prisma.user.findFirst({
      where: {
        email: email,
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });
    
    if (!userWithTenant) {
      return NextResponse.json({
        success: false,
        error: "User not found",
        step: "user_lookup"
      });
    }
    
    console.log("✅ TEST LOGIN: User found:", {
      id: userWithTenant.id,
      email: userWithTenant.email,
      name: userWithTenant.name,
      role: userWithTenant.role,
      isActive: userWithTenant.isActive,
      tenantId: userWithTenant.tenantId,
      hasPassword: !!userWithTenant.password,
      tenant: userWithTenant.tenant ? {
        id: userWithTenant.tenant.id,
        name: userWithTenant.tenant.name,
        subdomain: userWithTenant.tenant.subdomain,
        status: userWithTenant.tenant.status,
      } : null
    });
    
    // Step 2: Check password
    if (!userWithTenant.password) {
      return NextResponse.json({
        success: false,
        error: "User has no password set",
        step: "password_check"
      });
    }
    
    const isPasswordValid = await comparePassword(password, userWithTenant.password);
    
    console.log("🔐 TEST LOGIN: Password validation result:", isPasswordValid);
    
    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: "Invalid password",
        step: "password_validation"
      });
    }
    
    // Step 3: Check tenant status
    if (!userWithTenant.tenant) {
      return NextResponse.json({
        success: false,
        error: "User has no tenant",
        step: "tenant_check"
      });
    }
    
    if (userWithTenant.tenant.status !== "ACTIVE") {
      return NextResponse.json({
        success: false,
        error: "Tenant is not active",
        step: "tenant_status",
        tenantStatus: userWithTenant.tenant.status
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "Login test successful",
      user: {
        id: userWithTenant.id,
        email: userWithTenant.email,
        name: userWithTenant.name,
        role: userWithTenant.role,
        tenantId: userWithTenant.tenantId,
      },
      tenant: {
        id: userWithTenant.tenant.id,
        name: userWithTenant.tenant.name,
        subdomain: userWithTenant.tenant.subdomain,
        status: userWithTenant.tenant.status,
      }
    });

  } catch (error) {
    console.error("❌ TEST LOGIN: Error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      step: "exception"
    }, { status: 500 });
  }
}
