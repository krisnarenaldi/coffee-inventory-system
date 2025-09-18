import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";
import { canManageInventory } from "../../../../../lib/auth";

const storageLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional().nullable(),
  capacity: z.number().min(0, "Capacity must be non-negative").optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.role || !canManageInventory(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const storageLocation = await prisma.storageLocation.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!storageLocation) {
      return NextResponse.json(
        { error: "Storage location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(storageLocation);
  } catch (error) {
    console.error("Error fetching storage location:", error);
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.role || !canManageInventory(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = storageLocationSchema.parse(body);

    // Check if storage location exists and belongs to the tenant
    const existingLocation = await prisma.storageLocation.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Storage location not found" },
        { status: 404 }
      );
    }

    // Check if another storage location with the same name exists (excluding current one)
    const duplicateLocation = await prisma.storageLocation.findFirst({
      where: {
        tenantId: session.user.tenantId,
        name: validatedData.name,
        id: { not: params.id },
      },
    });

    if (duplicateLocation) {
      return NextResponse.json(
        { error: "Storage location with this name already exists" },
        { status: 400 }
      );
    }

    const updatedLocation = await prisma.storageLocation.update({
      where: {
        id: params.id,
      },
      data: validatedData,
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating storage location:", error);
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.role || !canManageInventory(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // Check if storage location exists and belongs to the tenant
    const existingLocation = await prisma.storageLocation.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Storage location not found" },
        { status: 404 }
      );
    }

    // TODO: Check if any products are using this storage location
    // const productsUsingLocation = await prisma.product.findFirst({
    //   where: {
    //     storageLocation: existingLocation.name,
    //     tenantId: session.user.tenantId,
    //   },
    // });
    // 
    // if (productsUsingLocation) {
    //   return NextResponse.json(
    //     { error: "Cannot delete storage location that is being used by products" },
    //     { status: 400 }
    //   );
    // }

    await prisma.storageLocation.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: "Storage location deleted successfully" });
  } catch (error) {
    console.error("Error deleting storage location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}