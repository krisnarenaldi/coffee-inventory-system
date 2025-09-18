import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Get dashboard statistics
    const [ingredientCount, batchCount, productCount] = await Promise.all([
      prisma.ingredient.count({
        where: { tenantId, isActive: true },
      }),
      prisma.batch.count({
        where: { tenantId },
      }),
      prisma.product.count({
        where: { tenantId },
      }),
    ]);

    // Get low stock count using raw query (similar to analytics API)
    const lowStockResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM ingredients
      WHERE tenantid = ${tenantId}
        AND isactive = true
        AND stockquantity <= minimumthreshold
    `;
    const lowStockCount = Number((lowStockResult as any)[0]?.count || 0);

    // Get recent batches
    const recentBatches = await prisma.batch.findMany({
      where: { tenantId },
      include: {
        recipe: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get low stock ingredients using raw query
    const lowStockIngredients = await prisma.$queryRaw`
      SELECT i.id, i.name, i.stockquantity, i.minimumthreshold, i.unitofmeasure,
             s.name as supplierName
      FROM ingredients i
      LEFT JOIN suppliers s ON i.supplierid = s.id
      WHERE i.tenantid = ${tenantId}
        AND i.isactive = true
        AND i.stockquantity <= i.minimumthreshold
      LIMIT 10
    `;

    return NextResponse.json({
      stats: {
        totalIngredients: ingredientCount,
        lowStockIngredients: lowStockCount,
        activeBatches: batchCount,
        totalProducts: productCount,
      },
      recentBatches,
      lowStockIngredients,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
