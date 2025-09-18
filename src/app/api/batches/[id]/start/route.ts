import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { z } from "zod";

// Validation schema for starting a batch
const startBatchSchema = z.object({
  startDate: z.string().optional(),
  notes: z.string().optional(),
  measurements: z.record(z.any()).optional(),
});

// POST /api/batches/[id]/start - Start a roast batch and deduct inventory
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const validatedData = startBatchSchema.parse(body);

    // Get batch with recipe and ingredients
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
                ingredient: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "PLANNED") {
      return NextResponse.json(
        { error: "Batch can only be started from PLANNED status" },
        { status: 400 }
      );
    }

    // Check if there's enough inventory for all ingredients
    const insufficientIngredients = [];
    for (const recipeIngredient of batch.recipe.ingredients) {
      const ingredient = recipeIngredient.ingredient;
      if (ingredient.stockQuantity < recipeIngredient.quantity) {
        insufficientIngredients.push({
          name: ingredient.name,
          required: recipeIngredient.quantity,
          available: ingredient.stockQuantity,
          unit: ingredient.unitOfMeasure,
        });
      }
    }

    if (insufficientIngredients.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient inventory for batch",
          insufficientIngredients,
        },
        { status: 400 }
      );
    }

    // Start transaction to update batch and deduct inventory
    const result = await prisma.$transaction(async (tx: any) => {
      // Update batch status and start date
      const updatedBatch = await tx.batch.update({
        where: { id: resolvedParams.id },
        data: {
          status: "GREEN_BEANS",
          startDate: validatedData.startDate
            ? new Date(validatedData.startDate)
            : new Date(),
          notes: validatedData.notes,
          measurements: validatedData.measurements,
        },
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
        },
      });

      // Deduct ingredients from inventory
      for (const recipeIngredient of batch.recipe.ingredients) {
        await tx.ingredient.update({
          where: { id: recipeIngredient.ingredientId },
          data: {
            stockQuantity: {
              decrement: recipeIngredient.quantity,
            },
          },
        });

        // Create inventory adjustment record
        await tx.inventoryAdjustment.create({
          data: {
            tenantId: session.user.tenantId,
            ingredientId: recipeIngredient.ingredientId,
            type: "DECREASE",
            quantity: recipeIngredient.quantity,
            reason: `Roast batch started: ${batch.batchNumber}`,
            createdById: session.user.id,
          },
        });
      }

      return updatedBatch;
    });

    return NextResponse.json({
      message: "Batch started successfully",
      batch: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error starting batch:", error);
    return NextResponse.json(
      { error: "Failed to start batch" },
      { status: 500 }
    );
  }
}
