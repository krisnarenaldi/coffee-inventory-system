import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, canManageProducts } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { checkProductLimit } from "../../../../lib/subscription-limits";
import { PackagingType } from "@prisma/client";
import { z } from "zod";

// Validation schema for creating/updating products
const productSchema = z.object({
  batchId: z.string().transform(val => val === "" ? undefined : val).optional(),
  name: z.string().min(1, "Product name is required"),
  packagingTypeId: z.string().transform(val => val === "" ? undefined : val).optional(),
  packagingDate: z.string().transform(val => val === "" ? undefined : val).optional(),
  lotNumber: z.string().transform(val => val === "" ? undefined : val).optional(),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  shelfLife: z.union([z.number().int().min(0), z.string().transform(val => val === "" ? undefined : Number(val))]).optional(),
  storageLocation: z.string().transform(val => val === "" ? undefined : val).optional(),
  status: z
    .enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "EXPIRED", "RECALLED"])
    .optional(),
});

// GET /api/products - Get all products with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage products
    if (!canManageProducts(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const packagingType = searchParams.get("packagingType") || "";
    const batchId = searchParams.get("batchId") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lotNumber: { contains: search, mode: 'insensitive' } },
        { storageLocation: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (packagingType) {
      where.packagingTypeId = packagingType;
    }

    if (batchId) {
      where.batchId = batchId;
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
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
          packagingType: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        totalCount,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage products
    if (!canManageProducts(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Check product limit
    const limitCheck = await checkProductLimit(session.user.tenantId!);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || "Product limit reached" },
        { status: 403 }
      );
    }

    // Handle empty batchId by setting it to null
    const batchId =
      validatedData.batchId && validatedData.batchId.trim() !== ""
        ? validatedData.batchId
        : null;

    // If batchId is provided, verify it exists and belongs to the tenant
    if (batchId) {
      const batch = await prisma.batch.findFirst({
        where: {
          id: batchId,
          tenantId: session.user.tenantId,
        },
      });

      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
    }

    // Generate lot number if not provided
    let lotNumber = validatedData.lotNumber;
    if (!lotNumber && validatedData.packagingDate) {
      const date = new Date(validatedData.packagingDate);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
      const timeStr = date.toTimeString().slice(0, 5).replace(":", "");
      lotNumber = `LOT-${dateStr}-${timeStr}`;
    }

    const product = await prisma.product.create({
      data: {
        tenantId: session.user.tenantId,
        batchId: batchId,
        name: validatedData.name,
        packagingTypeId: validatedData.packagingTypeId || null,
        packagingDate: validatedData.packagingDate
          ? new Date(validatedData.packagingDate)
          : null,
        lotNumber,
        quantity: validatedData.quantity,
        shelfLife: validatedData.shelfLife,
        storageLocation: validatedData.storageLocation,
        status: validatedData.status || "IN_STOCK",
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
        packagingType: true,
      },
    });

    return NextResponse.json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
