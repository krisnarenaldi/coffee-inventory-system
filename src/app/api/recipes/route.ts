import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { checkRecipeLimit } from "../../../../lib/subscription-limits";
import { z } from "zod";

// Validation schema for recipe creation/update
const createRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  style: z.string().optional(),
  description: z.string().optional(),
  expectedYield: z.number().positive("Expected yield must be positive"),
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

// GET /api/recipes - Get all recipes with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const style = searchParams.get("style") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Build where clause
    const where: any = {
      tenantId: session.user.tenantId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { style: { contains: search } },
      ];
    }

    if (style) {
      where.style = style;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (
      sortBy === "name" ||
      sortBy === "style" ||
      sortBy === "expectedYield" ||
      sortBy === "createdAt"
    ) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.name = "asc";
    }

    const skip = (page - 1) * limit;

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
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
          batches: {
            select: {
              id: true,
              batchNumber: true,
              status: true,
              startDate: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.recipe.count({ where }),
    ]);

    return NextResponse.json({
      recipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("JSON parsing error:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    let validatedData;
    try {
      validatedData = createRecipeSchema.parse(body);
    } catch (error) {
      console.error("Validation error:", error);
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      );
    }

    // Check recipe limit
    const limitCheck = await checkRecipeLimit(session.user.tenantId!);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || "Recipe limit reached" },
        { status: 403 }
      );
    }

    // Create recipe with ingredients in a transaction
    const recipe = await prisma.$transaction(async (tx: any) => {
      // Create the recipe
      const newRecipe = await tx.recipe.create({
        data: {
          tenantId: session.user.tenantId!,
          name: validatedData.name,
          style: validatedData.style,
          description: validatedData.description,
          expectedYield: validatedData.expectedYield,
          processInstructions: validatedData.processInstructions,
        },
      });

      // Add ingredients if provided
      if (validatedData.ingredients && validatedData.ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: validatedData.ingredients.map((ing) => ({
            recipeId: newRecipe.id,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
          })),
        });
      }

      // Return recipe with ingredients
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

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
