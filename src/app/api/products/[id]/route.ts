import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, canManageProducts } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { PackagingType } from "@prisma/client";
import { z } from "zod";

// Validation schema for updating products
const updateProductSchema = z.object({
  batchId: z
    .string()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  name: z.string().min(1, "Product name is required").optional(),
  packagingTypeId: z.string().transform(val => val === "" ? undefined : val).optional(),
  packagingDate: z.string().optional(),
  lotNumber: z.string().optional(),
  quantity: z.number().min(0, "Quantity must be non-negative").optional(),
  shelfLife: z.union([z.number().int().min(0), z.string().transform(val => val === "" ? undefined : Number(val))]).optional(),
  storageLocation: z.string().optional(),
  status: z
    .enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "EXPIRED", "RECALLED"])
    .optional(),
});

// GET /api/products/[id] - Get a specific product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage products
    if (!canManageProducts(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            recipe: {
              select: {
                id: true,
                name: true,
                style: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a specific product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage products
    if (!canManageProducts(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    // Check if product exists and belongs to tenant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // If batchId is being updated, verify it exists and belongs to the tenant
    if (validatedData.batchId && validatedData.batchId !== null) {
      const batch = await prisma.batch.findFirst({
        where: {
          id: validatedData.batchId,
          tenantId: session.user.tenantId,
        },
      });

      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.batchId !== undefined)
      updateData.batchId = validatedData.batchId;
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.packagingTypeId !== undefined)
      updateData.packagingTypeId = validatedData.packagingTypeId || null;
    if (validatedData.packagingDate !== undefined) {
      updateData.packagingDate = validatedData.packagingDate
        ? new Date(validatedData.packagingDate)
        : null;
    }
    if (validatedData.lotNumber !== undefined)
      updateData.lotNumber = validatedData.lotNumber;
    if (validatedData.quantity !== undefined)
      updateData.quantity = validatedData.quantity;
    if (validatedData.shelfLife !== undefined)
      updateData.shelfLife = validatedData.shelfLife;
    if (validatedData.storageLocation !== undefined)
      updateData.storageLocation = validatedData.storageLocation;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            recipe: {
              select: {
                id: true,
                name: true,
                style: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a specific product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage products
    if (!canManageProducts(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if product exists and belongs to tenant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
