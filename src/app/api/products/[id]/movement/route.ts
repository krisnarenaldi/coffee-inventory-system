import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { z } from "zod";

// Validation schema for product movement
const movementSchema = z.object({
  type: z.enum(["SALE", "TRANSFER", "ADJUSTMENT", "WASTE", "RETURN"]),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
  destination: z.string().optional(), // For transfers
  customerInfo: z.string().optional(), // For sales
  notes: z.string().optional(),
});

// POST /api/products/[id]/movement - Record product movement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = movementSchema.parse(body);

    // Get product with current quantity
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if there's enough quantity for outbound movements
    const outboundTypes = ["SALE", "TRANSFER", "WASTE"];
    const currentQuantity = Number(product.quantity);
    if (outboundTypes.includes(validatedData.type)) {
      if (currentQuantity < validatedData.quantity) {
        return NextResponse.json(
          {
            error: "Insufficient quantity",
            available: currentQuantity,
            requested: validatedData.quantity,
          },
          { status: 400 }
        );
      }
    }

    // Calculate new quantity based on movement type
    let quantityChange = 0;
    switch (validatedData.type) {
      case "SALE":
      case "TRANSFER":
      case "WASTE":
        quantityChange = -validatedData.quantity;
        break;
      case "RETURN":
      case "ADJUSTMENT":
        quantityChange = validatedData.quantity;
        break;
    }

    const newQuantity = currentQuantity + quantityChange;

    // Determine new status based on quantity
    let newStatus = product.status;
    if (newQuantity === 0) {
      newStatus = "OUT_OF_STOCK";
    } else if (newQuantity > 0 && product.status === "OUT_OF_STOCK") {
      newStatus = "IN_STOCK";
    }

    // Start transaction to update product and create movement record
    const result = await prisma.$transaction(async (tx: any) => {
      // Update product quantity and status
      const updatedProduct = await tx.product.update({
        where: { id: params.id },
        data: {
          quantity: newQuantity,
          status: newStatus,
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

      // Create movement record using inventory adjustment as a temporary solution
      // We'll create a dummy ingredient entry for product movements
      // This is a workaround until we create a proper ProductMovement model
      const dummyIngredient = await tx.ingredient.findFirst({
        where: { tenantId: session.user.tenantId },
        select: { id: true },
      });

      if (dummyIngredient) {
        await tx.inventoryAdjustment.create({
          data: {
            tenantId: session.user.tenantId,
            ingredientId: dummyIngredient.id,
            type: "USAGE", // Use existing enum value
            quantity: quantityChange,
            reason: `${validatedData.type}: ${validatedData.reason}`,
            createdById: session.user.id,
            notes: JSON.stringify({
              isProductMovement: true,
              productId: params.id,
              productName: product.name,
              movementType: validatedData.type,
              destination: validatedData.destination,
              customerInfo: validatedData.customerInfo,
              notes: validatedData.notes,
            }),
          },
        });
      }

      return updatedProduct;
    });

    return NextResponse.json({
      message: `Product ${validatedData.type.toLowerCase()} recorded successfully`,
      product: result,
      movement: {
        type: validatedData.type,
        quantity: validatedData.quantity,
        quantityChange,
        newQuantity,
        reason: validatedData.reason,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error recording product movement:", error);
    return NextResponse.json(
      { error: "Failed to record product movement" },
      { status: 500 }
    );
  }
}

// GET /api/products/[id]/movement - Get movement history for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if product exists and belongs to tenant
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get movement history from inventory adjustments
    // This is a temporary solution until we create a proper ProductMovement model
    const movements = await prisma.inventoryAdjustment.findMany({
      where: {
        tenantId: session.user.tenantId,
        notes: {
          contains: `"productId":"${params.id}"`,
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Parse the movement data
    const parsedMovements = movements.map((movement) => {
      let additionalData: any = {};
      try {
        additionalData = JSON.parse(movement.notes || "{}");
      } catch (e) {
        // Ignore parsing errors
      }

      return {
        id: movement.id,
        type: additionalData.movementType || movement.type,
        quantity: Math.abs(Number(movement.quantity)),
        quantityChange: Number(movement.quantity),
        reason: movement.reason,
        createdAt: movement.createdAt,
        createdBy: movement.createdBy,
        ...additionalData,
      };
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        currentQuantity: product.quantity,
      },
      movements: parsedMovements,
    });
  } catch (error) {
    console.error("Error fetching product movements:", error);
    return NextResponse.json(
      { error: "Failed to fetch product movements" },
      { status: 500 }
    );
  }
}
