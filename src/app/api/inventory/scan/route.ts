import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

const scanUpdateSchema = z.object({
  scannedData: z.string(),
  action: z.enum(["RECEIVE", "ADJUST", "LOOKUP"]),
  quantity: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = scanUpdateSchema.parse(body);

    // Parse the scanned data
    let parsedData: any;
    try {
      parsedData = JSON.parse(validatedData.scannedData);
    } catch {
      // If not JSON, treat as simple barcode/text
      parsedData = { text: validatedData.scannedData };
    }

    // Handle different actions
    switch (validatedData.action) {
      case "LOOKUP":
        return await handleLookup(parsedData, session.user.tenantId);

      case "RECEIVE":
        return await handleReceive(
          parsedData,
          validatedData,
          session.user.tenantId,
          session.user.id
        );

      case "ADJUST":
        return await handleAdjust(
          parsedData,
          validatedData,
          session.user.tenantId,
          session.user.id
        );

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Scan API error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleLookup(parsedData: any, tenantId: string) {
  // Try to find ingredient by ID, batch number, or name
  let ingredient = null;

  if (parsedData.id) {
    ingredient = await prisma.ingredient.findFirst({
      where: {
        id: parsedData.id,
        tenantId,
        isActive: true,
      },
      include: {
        supplier: true,
      },
    });
  }

  if (!ingredient && parsedData.batchNumber) {
    ingredient = await prisma.ingredient.findFirst({
      where: {
        batchNumber: parsedData.batchNumber,
        tenantId,
        isActive: true,
      },
      include: {
        supplier: true,
      },
    });
  }

  if (!ingredient && parsedData.name) {
    ingredient = await prisma.ingredient.findFirst({
      where: {
        name: {
          contains: parsedData.name,
        },
        tenantId,
        isActive: true,
      },
      include: {
        supplier: true,
      },
    });
  }

  if (!ingredient && parsedData.text) {
    // Search by batch number or name containing the scanned text
    ingredient = await prisma.ingredient.findFirst({
      where: {
        OR: [
          {
            batchNumber: {
              contains: parsedData.text,
            },
          },
          {
            name: {
              contains: parsedData.text,
            },
          },
        ],
        tenantId,
        isActive: true,
      },
      include: {
        supplier: true,
      },
    });
  }

  return NextResponse.json({
    found: !!ingredient,
    ingredient,
    parsedData,
  });
}

async function handleReceive(
  parsedData: any,
  validatedData: any,
  tenantId: string,
  userId: string
) {
  if (!validatedData.quantity || validatedData.quantity <= 0) {
    return NextResponse.json(
      { error: "Quantity is required for receiving" },
      { status: 400 }
    );
  }

  // Find the ingredient
  let ingredient = null;
  if (parsedData.id) {
    ingredient = await prisma.ingredient.findFirst({
      where: { id: parsedData.id, tenantId, isActive: true },
    });
  } else if (parsedData.batchNumber) {
    ingredient = await prisma.ingredient.findFirst({
      where: { batchNumber: parsedData.batchNumber, tenantId, isActive: true },
    });
  }

  if (!ingredient) {
    return NextResponse.json(
      { error: "Ingredient not found" },
      { status: 404 }
    );
  }

  // Update stock and create adjustment record
  const result = await prisma.$transaction(async (tx) => {
    // Update ingredient stock
    const updatedIngredient = await tx.ingredient.update({
      where: { id: ingredient.id },
      data: {
        stockQuantity: {
          increment: validatedData.quantity,
        },
        updatedAt: new Date(),
      },
      include: {
        supplier: true,
      },
    });

    // Create adjustment record
    await tx.inventoryAdjustment.create({
      data: {
        ingredientId: ingredient.id,
        type: "INCREASE",
        quantity: validatedData.quantity,
        reason: "QR_SCAN_RECEIVE",
        notes:
          validatedData.notes ||
          `Received via QR scan: ${
            parsedData.text || parsedData.batchNumber || "Unknown"
          }`,
        createdById: userId,
        tenantId,
      },
    });

    return updatedIngredient;
  });

  return NextResponse.json({
    success: true,
    ingredient: result,
    action: "received",
    quantity: validatedData.quantity,
  });
}

async function handleAdjust(
  parsedData: any,
  validatedData: any,
  tenantId: string,
  userId: string
) {
  if (!validatedData.quantity) {
    return NextResponse.json(
      { error: "Quantity is required for adjustment" },
      { status: 400 }
    );
  }

  // Find the ingredient
  let ingredient = null;
  if (parsedData.id) {
    ingredient = await prisma.ingredient.findFirst({
      where: { id: parsedData.id, tenantId, isActive: true },
    });
  } else if (parsedData.batchNumber) {
    ingredient = await prisma.ingredient.findFirst({
      where: { batchNumber: parsedData.batchNumber, tenantId, isActive: true },
    });
  }

  if (!ingredient) {
    return NextResponse.json(
      { error: "Ingredient not found" },
      { status: 404 }
    );
  }

  // Determine adjustment type
  const adjustmentType = validatedData.quantity > 0 ? "INCREASE" : "DECREASE";
  const adjustmentQuantity = Math.abs(validatedData.quantity);

  // Check if decrease would result in negative stock
  if (
    adjustmentType === "DECREASE" &&
    ingredient.stockQuantity.toNumber() < adjustmentQuantity
  ) {
    return NextResponse.json(
      { error: "Insufficient stock for this adjustment" },
      { status: 400 }
    );
  }

  // Update stock and create adjustment record
  const result = await prisma.$transaction(async (tx) => {
    // Update ingredient stock
    const updatedIngredient = await tx.ingredient.update({
      where: { id: ingredient.id },
      data: {
        stockQuantity: {
          [adjustmentType === "INCREASE" ? "increment" : "decrement"]:
            adjustmentQuantity,
        },
        updatedAt: new Date(),
      },
      include: {
        supplier: true,
      },
    });

    // Create adjustment record
    await tx.inventoryAdjustment.create({
      data: {
        ingredientId: ingredient.id,
        type: adjustmentType,
        quantity: adjustmentQuantity,
        reason: "QR_SCAN_ADJUST",
        notes:
          validatedData.notes ||
          `Adjusted via QR scan: ${
            parsedData.text || parsedData.batchNumber || "Unknown"
          }`,
        createdById: userId,
        tenantId,
      },
    });

    return updatedIngredient;
  });

  return NextResponse.json({
    success: true,
    ingredient: result,
    action: "adjusted",
    quantity: validatedData.quantity,
  });
}
