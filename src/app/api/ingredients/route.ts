import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { checkIngredientLimit } from "../../../../lib/subscription-limits";
import { z } from "zod";

const createIngredientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "COFFEE_BEANS",
    "MILK",
    "SUGAR",
    "SYRUP",
    "PASTRY",
    "PACKAGING",
    "OTHER",
  ]),
  stockQuantity: z.number().min(0, "Stock quantity must be non-negative"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  minimumThreshold: z.number().min(0, "Minimum threshold must be non-negative"),
  costPerUnit: z.number().min(0, "Cost per unit must be non-negative"),
  location: z.string().optional(),
  batchNumber: z.string().optional(),
  expirationDate: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const lowStock = searchParams.get("lowStock");
    const supplier = searchParams.get("supplier");
    const location = searchParams.get("location");
    const minStock = searchParams.get("minStock");
    const maxStock = searchParams.get("maxStock");
    const expiringDays = searchParams.get("expiringDays");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: session.user.tenantId,
      isActive: true,
    };

    // Enhanced search - search in name, batchNumber, and location
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          batchNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (supplier) {
      where.supplierId = supplier;
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    // Stock quantity filters
    if (minStock || maxStock) {
      where.stockQuantity = {};
      if (minStock) where.stockQuantity.gte = parseFloat(minStock);
      if (maxStock) where.stockQuantity.lte = parseFloat(maxStock);
    }

    // Note: Low stock filter will be applied after fetching data
    // since Prisma doesn't support field-to-field comparison in where clause
    let applyLowStockFilter = lowStock === "true";

    // Expiring items filter
    if (expiringDays) {
      const daysAhead = parseInt(expiringDays);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      where.expirationDate = {
        lte: futureDate.toISOString(),
        gte: new Date().toISOString(),
      };
    }

    // Dynamic sorting
    const orderBy: any = {};
    if (
      sortBy === "stockQuantity" ||
      sortBy === "minimumThreshold" ||
      sortBy === "costPerUnit"
    ) {
      orderBy[sortBy] = sortOrder;
    } else if (sortBy === "supplier") {
      orderBy.supplier = { name: sortOrder };
    } else if (sortBy === "expirationDate") {
      orderBy.expirationDate = sortOrder;
    } else {
      orderBy.name = sortOrder;
    }

    let ingredients, total;

    if (applyLowStockFilter) {
      // For low stock filter, we need to fetch all matching records first
      // then filter and paginate manually
      const allIngredients = await prisma.ingredient.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
      });

      // Filter for low stock (stockQuantity <= minimumThreshold)
      // Convert Decimal to number for proper comparison
      const lowStockIngredients = allIngredients.filter(
        (ingredient) => Number(ingredient.stockQuantity) <= Number(ingredient.minimumThreshold)
      );

      total = lowStockIngredients.length;
      ingredients = lowStockIngredients.slice(skip, skip + limit);
    } else {
      // Normal query without low stock filter
      [ingredients, total] = await Promise.all([
        prisma.ingredient.findMany({
          where,
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.ingredient.count({ where }),
      ]);
    }

    // Convert Decimal fields to numbers for frontend compatibility
    const serializedIngredients = ingredients.map(ingredient => ({
      ...ingredient,
      stockQuantity: Number(ingredient.stockQuantity),
      minimumThreshold: Number(ingredient.minimumThreshold),
      costPerUnit: Number(ingredient.costPerUnit),
    }));

    return NextResponse.json({
      ingredients: serializedIngredients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Ingredients GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription limits before creating ingredient
    const limitCheck = await checkIngredientLimit(session.user.tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Subscription limit exceeded", 
          message: limitCheck.message || "You have reached the maximum number of ingredients allowed by your subscription plan.",
          currentUsage: limitCheck.currentUsage,
          limit: limitCheck.limit
        }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createIngredientSchema.parse(body);

    const ingredient = await prisma.ingredient.create({
      data: {
        ...validatedData,
        expirationDate: validatedData.expirationDate
          ? new Date(validatedData.expirationDate)
          : null,
        tenantId: session.user.tenantId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Ingredients POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
