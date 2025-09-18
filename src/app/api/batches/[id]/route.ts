import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";

// Validation schema for batch updates
const updateBatchSchema = z.object({
  batchNumber: z.string().min(1).optional(),
  status: z
    .enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "GREEN_BEANS"])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  actualYield: z.number().optional(),
  notes: z.string().optional(),
  measurements: z.record(z.any()).optional(),
});

// GET /api/batches/[id] - Get a specific batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const batch = await prisma.batch.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.user.tenantId,
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    unitOfMeasure: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            quantity: true,
            packagingType: true,
            packagingDate: true,
            lotNumber: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error) {
    console.error("Error fetching batch:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch" },
      { status: 500 }
    );
  }
}

// PUT /api/batches/[id] - Update a batch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const validatedData = updateBatchSchema.parse(body);

    // Check if batch exists and belongs to tenant
    const existingBatch = await prisma.batch.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingBatch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // If updating batch number, check uniqueness
    if (
      validatedData.batchNumber &&
      validatedData.batchNumber !== existingBatch.batchNumber
    ) {
      const duplicateBatch = await prisma.batch.findFirst({
        where: {
          tenantId: session.user.tenantId,
          batchNumber: validatedData.batchNumber,
          id: { not: resolvedParams.id },
        },
      });

      if (duplicateBatch) {
        return NextResponse.json(
          { error: "Batch number already exists" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.batchNumber !== undefined) {
      updateData.batchNumber = validatedData.batchNumber;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    if (validatedData.startDate !== undefined) {
      updateData.startDate = validatedData.startDate
        ? new Date(validatedData.startDate)
        : null;
    }
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate
        ? new Date(validatedData.endDate)
        : null;
    }
    if (validatedData.actualYield !== undefined) {
      updateData.actualYield = validatedData.actualYield;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }
    if (validatedData.measurements !== undefined) {
      updateData.measurements = validatedData.measurements;
    }

    // Update batch
    const batch = await prisma.batch.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            style: true,
            expectedYield: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            quantity: true,
            packagingType: true,
          },
        },
      },
    });

    return NextResponse.json(batch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating batch:", error);
    return NextResponse.json(
      { error: "Failed to update batch" },
      { status: 500 }
    );
  }
}

// DELETE /api/batches/[id] - Delete a batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    // Check if batch exists and belongs to tenant
    const batch = await prisma.batch.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.user.tenantId,
      },
      include: {
        products: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Check if batch has associated products
    if (batch.products.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete batch with associated products" },
        { status: 400 }
      );
    }

    // Delete batch
    await prisma.batch.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ message: "Batch deleted successfully" });
  } catch (error) {
    console.error("Error deleting batch:", error);
    return NextResponse.json(
      { error: "Failed to delete batch" },
      { status: 500 }
    );
  }
}
