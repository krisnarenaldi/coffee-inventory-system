import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";

const updateIngredientSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  type: z
    .enum([
      "COFFEE_BEANS",
      "MILK",
      "SUGAR",
      "SYRUP",
      "PASTRY",
      "PACKAGING",
      "OTHER",
    ])
    .optional(),
  stockQuantity: z
    .number()
    .min(0, "Stock quantity must be non-negative")
    .optional(),
  unitOfMeasure: z.string().min(1, "Unit of measure is required").optional(),
  minimumThreshold: z
    .number()
    .min(0, "Minimum threshold must be non-negative")
    .optional(),
  costPerUnit: z
    .number()
    .min(0, "Cost per unit must be non-negative")
    .optional(),
  location: z.string().optional(),
  batchNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  supplierId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ingredient = await prisma.ingredient.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        adjustments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          include: {
            createdBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("Ingredient GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateIngredientSchema.parse(body);

    // Check if ingredient exists and belongs to tenant
    const existingIngredient = await prisma.ingredient.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingIngredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validatedData };
    if (validatedData.expirationDate) {
      updateData.expirationDate = new Date(validatedData.expirationDate);
    }

    const ingredient = await prisma.ingredient.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(ingredient);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Ingredient PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if ingredient exists and belongs to tenant
    const existingIngredient = await prisma.ingredient.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingIngredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.ingredient.update({
      where: {
        id: params.id,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ message: "Ingredient deleted successfully" });
  } catch (error) {
    console.error("Ingredient DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
