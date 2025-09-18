import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";

// Validation schema for recipe update
const updateRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required").optional(),
  style: z.string().optional(),
  description: z.string().optional(),
  expectedYield: z
    .number()
    .positive("Expected yield must be positive")
    .optional(),
  processInstructions: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string(),
        quantity: z.number().positive("Quantity must be positive"),
        unit: z.string().min(1, "Unit is required"),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

// GET /api/recipes/[id] - Get a specific recipe
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.user.tenantId,
        isActive: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                type: true,
                unitOfMeasure: true,
                stockQuantity: true,
              },
            },
          },
        },
        batches: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            actualYield: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

// PUT /api/recipes/[id] - Update a recipe
export async function PUT(
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
    const validatedData = updateRecipeSchema.parse(body);

    // Check if recipe exists and belongs to tenant
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.user.tenantId,
        isActive: true,
      },
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Update recipe with ingredients in a transaction
    const updatedRecipe = await prisma.$transaction(async (tx: any) => {
      // Update the recipe
      const recipe = await tx.recipe.update({
        where: { id: resolvedParams.id },
        data: {
          name: validatedData.name,
          style: validatedData.style,
          description: validatedData.description,
          expectedYield: validatedData.expectedYield,
          processInstructions: validatedData.processInstructions,
          version: existingRecipe.version + 1, // Increment version
        },
      });

      // Update ingredients if provided
      if (validatedData.ingredients) {
        // Delete existing ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: resolvedParams.id },
        });

        // Add new ingredients
        if (validatedData.ingredients.length > 0) {
          await tx.recipeIngredient.createMany({
            data: validatedData.ingredients.map((ing) => ({
              recipeId: resolvedParams.id,
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes,
            })),
          });
        }
      }

      // Return updated recipe with ingredients
      return tx.recipe.findUnique({
        where: { id: resolvedParams.id },
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
      });
    });

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

// DELETE /api/recipes/[id] - Soft delete a recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check if recipe exists and belongs to tenant
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.user.tenantId,
        isActive: true,
      },
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Check if recipe is used in any active batches
    const activeBatches = await prisma.batch.count({
      where: {
        recipeId: resolvedParams.id,
        status: {
          in: ["PLANNED", "IN_PROGRESS", "GREEN_BEANS"],
        },
      },
    });

    if (activeBatches > 0) {
      return NextResponse.json(
        { error: "Cannot delete recipe with active batches" },
        { status: 400 }
      );
    }

    // Soft delete the recipe
    await prisma.recipe.update({
      where: { id: resolvedParams.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
