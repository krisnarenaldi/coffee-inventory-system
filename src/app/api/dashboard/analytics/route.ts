import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

// GET /api/dashboard/analytics - Get comprehensive dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Parallel data fetching for better performance
    const [
      totalIngredients,
      totalProducts,
      totalBatches,
      activeBatches,
      lowStockIngredients,
      expiringIngredients,
      recentBatches,
      inventoryValue,
      productionMetrics,
      alertCounts,
      upcomingSchedules,
    ] = await Promise.all([
      // Total ingredients count
      prisma.ingredient.count({
        where: { tenantId, isActive: true },
      }),

      // Total products count
      prisma.product.count({
        where: { tenantId },
      }),

      // Total batches count
      prisma.batch.count({
        where: { tenantId },
      }),

      // Active batches (in progress)
      prisma.batch.count({
        where: {
          tenantId,
          status: {
            in: ["ROASTING", "COOLING", "PACKAGING"],
          },
        },
      }),

      // Low stock ingredients - using raw query to compare stockQuantity with minimumThreshold
      prisma.$queryRaw`
        SELECT id, name, stockquantity, minimumthreshold, unitofmeasure
        FROM ingredients
        WHERE tenantid = ${tenantId}
          AND isactive = true
          AND stockquantity <= minimumthreshold
        ORDER BY (stockquantity / NULLIF(minimumthreshold, 0)) ASC
        LIMIT 10
      `,

      // Expiring ingredients (next 30 days)
      prisma.ingredient.findMany({
        where: {
          tenantId,
          isActive: true,
          expirationDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
        select: {
          id: true,
          name: true,
          expirationDate: true,
          stockQuantity: true,
          unitOfMeasure: true,
        },
        orderBy: {
          expirationDate: "asc",
        },
        take: 10,
      }),

      // Recent batches
      prisma.batch.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          recipe: {
            select: {
              name: true,
              style: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),

      // Inventory valuation
      prisma.ingredient.aggregate({
        where: {
          tenantId,
          isActive: true,
        },
        _sum: {
          costPerUnit: true,
        },
      }),

      // Production metrics for the period
      prisma.batch.aggregate({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
          },
          status: "COMPLETED",
        },
        _count: {
          id: true,
        },
        _sum: {
          actualYield: true,
        },
        _avg: {
          actualYield: true,
        },
      }),

      // Alert counts by severity
      prisma.alert.groupBy({
        by: ["severity"],
        where: {
          tenantId,
          isResolved: false,
        },
        _count: {
          id: true,
        },
      }),

      // Upcoming schedules (next 7 days)
      prisma.schedule.findMany({
        where: {
          tenantId,
          startDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          status: "SCHEDULED",
        },
        orderBy: {
          startDate: "asc",
        },
        take: 5,
      }),
    ]);

    // Convert BigInt values from raw SQL queries to numbers for JSON serialization
    const lowStockIngredientsConverted = (lowStockIngredients as any[]).map(
      (row) => ({
        id: row.id,
        name: row.name,
        stockQuantity: Number(row.stockQuantity),
        minimumThreshold: Number(row.minimumThreshold),
        unitOfMeasure: row.unitOfMeasure,
      })
    );

    // Calculate inventory valuation more accurately
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        stockQuantity: true,
        costPerUnit: true,
      },
    });

    const totalInventoryValue = ingredients.reduce((total, ingredient) => {
      return (
        total +
        Number(ingredient.stockQuantity) * Number(ingredient.costPerUnit)
      );
    }, 0);

    // Calculate production efficiency
    const productionEfficiency = productionMetrics._avg.actualYield
      ? Number(productionMetrics._avg.actualYield) * 0.85 // Estimated 85% efficiency
      : 0;

    // Get batch status distribution
    const batchStatusDistribution = await prisma.batch.groupBy({
      by: ["status"],
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get daily production trend
    const dailyProductionRaw = await prisma.$queryRaw`
      SELECT
        DATE(createdat) as date,
        COUNT(*) as batches,
        SUM(actualyield) as totalYield
      FROM batches
      WHERE tenantid = ${tenantId}
        AND createdat >= ${startDate}
        AND status = 'COMPLETED'
      GROUP BY DATE(createdat)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Convert BigInt values to numbers for JSON serialization
    const dailyProduction = (dailyProductionRaw as any[]).map((row) => ({
      date: row.date,
      batches: Number(row.batches),
      totalYield: row.totalYield ? Number(row.totalYield) : 0,
    }));

    // Format alert counts
    const alertSummary = {
      total: alertCounts.reduce((sum, alert) => sum + alert._count.id, 0),
      critical:
        alertCounts.find((a) => a.severity === "CRITICAL")?._count.id || 0,
      high: alertCounts.find((a) => a.severity === "HIGH")?._count.id || 0,
      medium: alertCounts.find((a) => a.severity === "MEDIUM")?._count.id || 0,
      low: alertCounts.find((a) => a.severity === "LOW")?._count.id || 0,
    };

    // Calculate trends (compare with previous period)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(
      previousPeriodStart.getDate() - parseInt(period)
    );

    const previousPeriodBatches = await prisma.batch.count({
      where: {
        tenantId,
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate,
        },
      },
    });

    const batchTrend =
      totalBatches > 0 && previousPeriodBatches > 0
        ? ((totalBatches - previousPeriodBatches) / previousPeriodBatches) * 100
        : 0;

    return NextResponse.json({
      overview: {
        totalIngredients,
        totalProducts,
        totalBatches,
        activeBatches,
        inventoryValue: totalInventoryValue,
        productionEfficiency: Math.round(productionEfficiency * 100) / 100,
      },
      trends: {
        batchTrend: Math.round(batchTrend * 100) / 100,
        period: parseInt(period),
      },
      alerts: alertSummary,
      inventory: {
        lowStock: lowStockIngredientsConverted,
        expiring: expiringIngredients,
      },
      production: {
        recentBatches,
        statusDistribution: batchStatusDistribution,
        dailyTrend: dailyProduction,
        totalYield: productionMetrics._sum?.actualYield
          ? Number(productionMetrics._sum.actualYield)
          : 0,
        totalLoss: 0, // Loss data not available in current schema
        averageYield: productionMetrics._avg?.actualYield
          ? Number(productionMetrics._avg.actualYield)
          : 0,
        averageLoss: 0, // Loss data not available in current schema
      },
      schedule: {
        upcoming: upcomingSchedules,
      },
      period: {
        days: parseInt(period),
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard analytics" },
      { status: 500 }
    );
  }
}
