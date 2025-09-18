import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

// POST /api/recipes/[id]/duplicate - Duplicate a recipe
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if recipe exists and belongs to tenant
    const originalRecipe = await prisma.recipe.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        isActive: true,
      },
      include: {
        ingredients: true,
      },
    });

    if (!originalRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Duplicate recipe with ingredients in a transaction
    const duplicatedRecipe = await prisma.$transaction(async (tx: any) => {
      // Create the duplicated recipe
      const newRecipe = await tx.recipe.create({
        data: {
          tenantId: session.user.tenantId!,
          name: `${originalRecipe.name} (Copy)`,
          style: originalRecipe.style,
          description: originalRecipe.description,
          expectedYield: originalRecipe.expectedYield,
          processInstructions: originalRecipe.processInstructions,
          version: 1, // Start with version 1 for the copy
        },
      });

      // Duplicate ingredients
      if (originalRecipe.ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: originalRecipe.ingredients.map((ing) => ({
            recipeId: newRecipe.id,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
          })),
        });
      }

      // Return duplicated recipe with ingredients
      return tx.recipe.findUnique({
        where: { id: newRecipe.id },
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

    return NextResponse.json(duplicatedRecipe, { status: 201 });
  } catch (error) {
    console.error("Error duplicating recipe:", error);
    return NextResponse.json(
      { error: "Failed to duplicate recipe" },
      { status: 500 }
    );
  }
}
