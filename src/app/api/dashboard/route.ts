import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { getCachedOrFetch, CacheKeys, CacheTTL } from "../../../../lib/cache";
import {
  createCachedResponse,
  CacheConfigs,
} from "../../../../lib/cache-headers";
import { measureAsync } from "../../../../lib/performance-monitor";

export async function GET(request: NextRequest) {
  return measureAsync(
    "dashboard_api",
    async () => {
      try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.tenantId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Use cached data with fallback to database queries
        const [stats, recentBatches, lowStockIngredients] = await Promise.all([
          // Cache dashboard stats for 2 minutes
          getCachedOrFetch(
            CacheKeys.dashboardStats(tenantId),
            async () => {
              const [
                ingredientCount,
                batchCount,
                productCount,
                lowStockResult,
              ] = await Promise.all([
                prisma.ingredient.count({
                  where: { tenantId, isActive: true },
                }),
                prisma.batch.count({
                  where: { tenantId },
                }),
                prisma.product.count({
                  where: { tenantId },
                }),
                prisma.$queryRaw`
              SELECT COUNT(*) as count
              FROM ingredients
              WHERE tenantid = ${tenantId}
                AND isactive = true
                AND stockquantity <= minimumthreshold
            `,
              ]);

              const lowStockCount = Number(
                (lowStockResult as any)[0]?.count || 0
              );

              return {
                totalIngredients: ingredientCount,
                lowStockIngredients: lowStockCount,
                activeBatches: batchCount,
                totalProducts: productCount,
              };
            },
            CacheTTL.SHORT // 1 minute cache for stats
          ),

          // Cache recent batches for 1 minute
          getCachedOrFetch(
            CacheKeys.recentBatches(tenantId),
            async () => {
              return await prisma.batch.findMany({
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
            },
            CacheTTL.SHORT // 1 minute cache for recent batches
          ),

          // Cache low stock ingredients for 2 minutes
          getCachedOrFetch(
            CacheKeys.lowStockIngredients(tenantId),
            async () => {
              return await prisma.$queryRaw`
            SELECT i.id, i.name, i.stockquantity, i.minimumthreshold, i.unitofmeasure,
                   s.name as supplierName
            FROM ingredients i
            LEFT JOIN suppliers s ON i.supplierid = s.id
            WHERE i.tenantid = ${tenantId}
              AND i.isactive = true
              AND i.stockquantity <= i.minimumthreshold
            LIMIT 10
          `;
            },
            CacheTTL.SHORT // 1 minute cache for low stock
          ),
        ]);

        return createCachedResponse(
          {
            stats,
            recentBatches,
            lowStockIngredients,
          },
          CacheConfigs.dashboardCache
        );
      } catch (error) {
        console.error("Dashboard API error:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    },
    { tenantId }
  );
}
