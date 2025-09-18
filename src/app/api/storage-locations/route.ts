import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { canManageInventory } from "../../../../lib/auth";
import { checkStorageLocationLimit } from "../../../../lib/subscription-limits";

const storageLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional().nullable(),
  capacity: z.number().min(0, "Capacity must be non-negative").optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClause: any = {
      tenantId: session.user.tenantId,
    };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const storageLocations = await prisma.storageLocation.findMany({
      where: whereClause,
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(storageLocations);
  } catch (error) {
    console.error("Error fetching storage locations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Check storage location limit
    const limitCheck = await checkStorageLocationLimit(session.user.tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || "Storage location limit reached" },
        { status: 403 }
      );
    }

    // Check if storage location with same name already exists for this tenant
    const existingLocation = await prisma.storageLocation.findFirst({
      where: {
        tenantId: session.user.tenantId,
        name: validatedData.name,
      },
    });

    if (existingLocation) {
      return NextResponse.json(
        { error: "Storage location with this name already exists" },
        { status: 400 }
      );
    }

    const storageLocation = await prisma.storageLocation.create({
      data: {
        ...validatedData,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json(storageLocation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating storage location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}