import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { checkBatchLimit } from "../../../../lib/subscription-limits";
import { z } from "zod";

// Validation schema for batch creation
const createBatchSchema = z.object({
  recipeId: z.string().min(1, "Recipe ID is required"),
  batchNumber: z.string().min(1, "Batch number is required"),
  startDate: z.string().optional(),
  notes: z.string().optional(),
  measurements: z.record(z.any()).optional(),
});

// GET /api/batches - Fetch batches with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const recipeId = searchParams.get("recipeId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { recipe: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (recipeId) {
      where.recipeId = recipeId;
    }

    // Get batches with related data
    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
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
          products: {
            select: {
              id: true,
              name: true,
              quantity: true,
              packagingType: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.batch.count({ where }),
    ]);

    return NextResponse.json({
      batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}

// POST /api/batches - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBatchSchema.parse(body);

    // Check if recipe exists and belongs to tenant
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: validatedData.recipeId,
        tenantId: session.user.tenantId,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Check if batch number is unique for tenant
    const existingBatch = await prisma.batch.findFirst({
      where: {
        tenantId: session.user.tenantId,
        batchNumber: validatedData.batchNumber,
      },
    });

    if (existingBatch) {
      return NextResponse.json(
        { error: "Batch number already exists" },
        { status: 400 }
      );
    }

    // Check subscription limits
    const batchLimitCheck = await checkBatchLimit(session.user.tenantId);
    if (!batchLimitCheck.allowed) {
      return NextResponse.json(
        { error: batchLimitCheck.message },
        { status: 403 }
      );
    }

    // Create batch
    const batch = await prisma.batch.create({
      data: {
        tenantId: session.user.tenantId,
        recipeId: validatedData.recipeId,
        batchNumber: validatedData.batchNumber,
        startDate: validatedData.startDate
          ? new Date(validatedData.startDate)
          : null,
        notes: validatedData.notes,
        measurements: validatedData.measurements,
        createdById: session.user.id,
        status: "PLANNED",
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

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating batch:", error);
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}
