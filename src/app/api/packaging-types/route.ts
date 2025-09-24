import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { canManagePackagingTypes } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";

// Validation schemas
const createPackagingTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/packaging-types - Get all packaging types for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view packaging types
    if (!canManagePackagingTypes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const packagingTypes = await prisma.packagingType.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(packagingTypes);
  } catch (error) {
    console.error("Error fetching packaging types:", error);
    return NextResponse.json(
      { error: "Failed to fetch packaging types" },
      { status: 500 }
    );
  }
}

// POST /api/packaging-types - Create a new packaging type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage packaging types
    if (!canManagePackagingTypes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createPackagingTypeSchema.parse(body);

    // Check if packaging type with same name already exists for this tenant
    const existingPackagingType = await prisma.packagingType.findFirst({
      where: {
        tenantId: session.user.tenantId,
        name: validatedData.name,
      },
    });

    if (existingPackagingType) {
      return NextResponse.json(
        { error: "A packaging type with this name already exists" },
        { status: 409 }
      );
    }

    // Debug: Check if tenant exists
    console.log('Creating packaging type for tenantId:', session.user.tenantId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId }
    });
    
    if (!tenant) {
      console.error('Tenant not found:', session.user.tenantId);
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 400 }
      );
    }

    const packagingType = await prisma.packagingType.create({
      data: {
        tenantId: session.user.tenantId,
        name: validatedData.name,
        description: validatedData.description || null,
        isActive: validatedData.isActive,
      },
      // Return the created object for optimized client-side updates
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(packagingType, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating packaging type:", error);
    return NextResponse.json(
      { error: "Failed to create packaging type" },
      { status: 500 }
    );
  }
}
