import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { canManagePackagingTypes } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";

// Validation schemas
const updatePackagingTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/packaging-types/[id] - Get a specific packaging type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view packaging types
    if (!canManagePackagingTypes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const packagingType = await prisma.packagingType.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!packagingType) {
      return NextResponse.json(
        { error: "Packaging type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(packagingType);
  } catch (error) {
    console.error("Error fetching packaging type:", error);
    return NextResponse.json(
      { error: "Failed to fetch packaging type" },
      { status: 500 }
    );
  }
}

// PUT /api/packaging-types/[id] - Update a specific packaging type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updatePackagingTypeSchema.parse(body);

    // Check if packaging type exists and belongs to tenant
    const existingPackagingType = await prisma.packagingType.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingPackagingType) {
      return NextResponse.json(
        { error: "Packaging type not found" },
        { status: 404 }
      );
    }

    // If name is being updated, check for duplicates
    if (
      validatedData.name &&
      validatedData.name !== existingPackagingType.name
    ) {
      const duplicatePackagingType = await prisma.packagingType.findFirst({
        where: {
          tenantId: session.user.tenantId,
          name: validatedData.name,
          NOT: {
            id: params.id,
          },
        },
      });

      if (duplicatePackagingType) {
        return NextResponse.json(
          { error: "A packaging type with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updatedPackagingType = await prisma.packagingType.update({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      data: validatedData,
    });

    return NextResponse.json(updatedPackagingType);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating packaging type:", error);
    return NextResponse.json(
      { error: "Failed to update packaging type" },
      { status: 500 }
    );
  }
}

// DELETE /api/packaging-types/[id] - Delete a specific packaging type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage packaging types
    if (!canManagePackagingTypes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if packaging type exists and belongs to tenant
    const existingPackagingType = await prisma.packagingType.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingPackagingType) {
      return NextResponse.json(
        { error: "Packaging type not found" },
        { status: 404 }
      );
    }

    // Check if packaging type is being used by any products
    const productsUsingPackagingType = await prisma.product.findFirst({
      where: {
        packagingType: {
          id: params.id,
        },
        tenantId: session.user.tenantId,
      },
    });

    if (productsUsingPackagingType) {
      return NextResponse.json(
        {
          error:
            "Cannot delete packaging type. It is currently being used by products.",
        },
        { status: 409 }
      );
    }

    await prisma.packagingType.delete({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json({
      message: "Packaging type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting packaging type:", error);
    return NextResponse.json(
      { error: "Failed to delete packaging type" },
      { status: 500 }
    );
  }
}
