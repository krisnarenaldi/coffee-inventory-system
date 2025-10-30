import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";

const wasteEntrySchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
  category: z.enum(["production", "quality", "expiration", "process"]),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = wasteEntrySchema.parse(body);

    // Check if ingredient exists and belongs to the tenant
    const ingredient = await prisma.ingredient.findFirst({
      where: {
        id: validatedData.ingredientId,
        tenantId: session.user.tenantId,
        isActive: true,
      },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    // Check if there's enough stock
    if (ingredient.stockQuantity < validatedData.quantity) {
      return NextResponse.json(
        { error: "Insufficient stock quantity" },
        { status: 400 }
      );
    }

    // Create waste movement and update ingredient stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create inventory movement record
      const wasteMovement = await tx.inventoryMovement.create({
        data: {
          tenantId: session.user.tenantId,
          ingredientId: validatedData.ingredientId,
          type: "WASTE",
          quantity: -validatedData.quantity, // Negative for waste
          notes: `${validatedData.category}: ${validatedData.reason}${
            validatedData.notes ? ` - ${validatedData.notes}` : ""
          }`,
          createdById: session.user.id,
        },
        include: {
          ingredient: {
            select: {
              name: true,
              unitOfMeasure: true,
            },
          },
        },
      });

      // Update ingredient stock quantity
      const updatedIngredient = await tx.ingredient.update({
        where: { id: validatedData.ingredientId },
        data: {
          stockQuantity: {
            decrement: validatedData.quantity,
          },
        },
      });

      // Create alert if stock falls below minimum threshold
      if (updatedIngredient.stockQuantity <= updatedIngredient.minimumThreshold) {
        await tx.alert.create({
          data: {
            tenantId: session.user.tenantId,
            type: "LOW_STOCK",
            severity: updatedIngredient.stockQuantity <= 0 ? "CRITICAL" : "HIGH",
            title: `Low Stock Alert: ${ingredient.name}`,
            message: `${ingredient.name} stock is ${
              updatedIngredient.stockQuantity <= 0 ? "out of stock" : "below minimum threshold"
            }. Current: ${updatedIngredient.stockQuantity} ${ingredient.unitOfMeasure}, Minimum: ${updatedIngredient.minimumThreshold} ${ingredient.unitOfMeasure}`,
            resourceType: "ingredient",
            resourceId: validatedData.ingredientId,
            isRead: false,
            createdById: session.user.id,
          },
        });
      }

      return { wasteMovement, updatedIngredient };
    });

    return NextResponse.json({
      success: true,
      message: "Waste recorded successfully",
      wasteMovement: {
        id: result.wasteMovement.id,
        ingredientName: result.wasteMovement.ingredient.name,
        quantity: Math.abs(result.wasteMovement.quantity),
        unitOfMeasure: result.wasteMovement.ingredient.unitOfMeasure,
        reason: validatedData.reason,
        category: validatedData.category,
        createdAt: result.wasteMovement.createdAt,
      },
      updatedStock: {
        ingredientId: validatedData.ingredientId,
        newStockQuantity: result.updatedIngredient.stockQuantity,
        belowThreshold: result.updatedIngredient.stockQuantity <= result.updatedIngredient.minimumThreshold,
      },
    });

  } catch (error) {
    console.error("Error recording waste:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to record waste" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get recent waste movements
    const wasteMovements = await prisma.inventoryMovement.findMany({
      where: {
        tenantId: session.user.tenantId,
        type: "WASTE",
      },
      include: {
        ingredient: {
          select: {
            name: true,
            unitOfMeasure: true,
            costPerUnit: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const formattedMovements = wasteMovements.map((movement) => ({
      id: movement.id,
      ingredientName: movement.ingredient.name,
      quantity: Math.abs(Number(movement.quantity)),
      unitOfMeasure: movement.ingredient.unitOfMeasure,
      costImpact: Math.abs(Number(movement.quantity)) * Number(movement.ingredient.costPerUnit),
      reason: movement.notes || "No reason specified",
      createdBy: movement.createdBy.name,
      createdAt: movement.createdAt,
    }));

    return NextResponse.json({
      wasteMovements: formattedMovements,
      total: wasteMovements.length,
    });

  } catch (error) {
    console.error("Error fetching waste movements:", error);
    return NextResponse.json(
      { error: "Failed to fetch waste movements" },
      { status: 500 }
    );
  }
}