import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    console.log("🔍 DEBUG: Looking up user:", email);
    
    // Step 1: Find user by email (any tenant)
    const users = await prisma.user.findMany({
      where: {
        email: email,
      },
      include: {
        tenant: true,
      },
    });
    
    console.log("👥 DEBUG: All users with this email:", users.length);
    
    // Step 2: Find active users only
    const activeUsers = await prisma.user.findMany({
      where: {
        email: email,
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });
    
    console.log("✅ DEBUG: Active users with this email:", activeUsers.length);
    
    // Step 3: Check specific tenant (coffee-central)
    const coffeeCentralTenant = await prisma.tenant.findUnique({
      where: { subdomain: "coffee-central" }
    });
    
    let coffeeCentralUser = null;
    if (coffeeCentralTenant) {
      coffeeCentralUser = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: coffeeCentralTenant.id,
            email: email,
          },
        },
        include: {
          tenant: true,
        },
      });
    }
    
    // Step 4: Check password field
    const userWithPassword = await prisma.user.findFirst({
      where: {
        email: email,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        tenantId: true,
        password: true, // Check if password exists
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true,
          }
        }
      },
    });
    
    return NextResponse.json({
      success: true,
      debug: {
        email,
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        coffeeCentralTenant: coffeeCentralTenant ? {
          id: coffeeCentralTenant.id,
          name: coffeeCentralTenant.name,
          subdomain: coffeeCentralTenant.subdomain,
          status: coffeeCentralTenant.status,
        } : null,
        coffeeCentralUser: coffeeCentralUser ? {
          id: coffeeCentralUser.id,
          email: coffeeCentralUser.email,
          name: coffeeCentralUser.name,
          role: coffeeCentralUser.role,
          isActive: coffeeCentralUser.isActive,
          tenantId: coffeeCentralUser.tenantId,
          hasPassword: !!coffeeCentralUser.password,
          tenant: coffeeCentralUser.tenant,
        } : null,
        firstActiveUser: userWithPassword ? {
          id: userWithPassword.id,
          email: userWithPassword.email,
          name: userWithPassword.name,
          role: userWithPassword.role,
          isActive: userWithPassword.isActive,
          tenantId: userWithPassword.tenantId,
          hasPassword: !!userWithPassword.password,
          passwordLength: userWithPassword.password?.length || 0,
          tenant: userWithPassword.tenant,
        } : null,
      },
      allUsers: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        tenantId: user.tenantId,
        hasPassword: !!user.password,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          subdomain: user.tenant.subdomain,
          status: user.tenant.status,
        } : null,
      })),
    });

  } catch (error) {
    console.error("❌ DEBUG: Error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
