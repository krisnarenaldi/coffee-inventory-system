import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// POST /api/alerts/check-low-stock - Check for low stock conditions and create alerts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const alertsCreated = [];

    // Check ingredients for low stock
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        minimumThreshold: {
          gt: 0, // Only check ingredients with a threshold set
        },
      },
    });

    for (const ingredient of ingredients) {
      const currentStock = Number(ingredient.stockQuantity);
      const threshold = Number(ingredient.minimumThreshold);

      if (currentStock <= threshold) {
        // Check if we already have an unresolved low stock alert for this ingredient
        const existingAlert = await prisma.alert.findFirst({
          where: {
            tenantId,
            type: 'LOW_STOCK',
            title: `Low Stock: ${ingredient.name}`,
            isResolved: false,
          },
        });

        if (!existingAlert) {
          const severity = currentStock === 0 ? 'CRITICAL' : 
                          currentStock <= threshold * 0.5 ? 'HIGH' : 'MEDIUM';

          const alert = await prisma.alert.create({
            data: {
              tenantId,
              type: 'LOW_STOCK',
              title: `Low Stock: ${ingredient.name}`,
              message: `${ingredient.name} is running low. Current stock: ${currentStock} ${ingredient.unitOfMeasure}. Threshold: ${threshold} ${ingredient.unitOfMeasure}.`,
              severity,
            },
          });

          alertsCreated.push(alert);
        }
      }
    }

    // Check finished products for low stock
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        status: 'IN_STOCK',
      },
    });

    // Group products by name to calculate total stock
    const productStockMap = new Map<string, { total: number, products: any[] }>();
    
    for (const product of products) {
      const key = product.name;
      const quantity = Number(product.quantity);
      
      if (productStockMap.has(key)) {
        const existing = productStockMap.get(key)!;
        existing.total += quantity;
        existing.products.push(product);
      } else {
        productStockMap.set(key, { total: quantity, products: [product] });
      }
    }

    // Check each product type for low stock (using a default threshold of 10 units)
    for (const [productName, stockInfo] of productStockMap) {
      const defaultThreshold = 10; // This could be made configurable per product type
      
      if (stockInfo.total <= defaultThreshold) {
        // Check if we already have an unresolved low stock alert for this product
        const existingAlert = await prisma.alert.findFirst({
          where: {
            tenantId,
            type: 'LOW_STOCK',
            title: `Low Stock: ${productName}`,
            isResolved: false,
          },
        });

        if (!existingAlert) {
          const severity = stockInfo.total === 0 ? 'CRITICAL' : 
                          stockInfo.total <= defaultThreshold * 0.5 ? 'HIGH' : 'MEDIUM';

          const alert = await prisma.alert.create({
            data: {
              tenantId,
              type: 'LOW_STOCK',
              title: `Low Stock: ${productName}`,
              message: `${productName} is running low. Current total stock: ${stockInfo.total} units. Threshold: ${defaultThreshold} units.`,
              severity,
            },
          });

          alertsCreated.push(alert);
        }
      }
    }

    return NextResponse.json({
      message: `Low stock check completed. ${alertsCreated.length} new alerts created.`,
      alertsCreated: alertsCreated.length,
      alerts: alertsCreated,
    });
  } catch (error) {
    console.error('Error checking low stock:', error);
    return NextResponse.json(
      { error: 'Failed to check low stock' },
      { status: 500 }
    );
  }
}

// GET /api/alerts/check-low-stock - Get current low stock status without creating alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const lowStockItems = [];

    // Check ingredients for low stock
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        minimumThreshold: {
          gt: 0,
        },
      },
    });

    for (const ingredient of ingredients) {
      const currentStock = Number(ingredient.stockQuantity);
      const threshold = Number(ingredient.minimumThreshold);

      if (currentStock <= threshold) {
        lowStockItems.push({
          type: 'ingredient',
          id: ingredient.id,
          name: ingredient.name,
          currentStock,
          threshold,
          unit: ingredient.unitOfMeasure,
          severity: currentStock === 0 ? 'CRITICAL' : 
                   currentStock <= threshold * 0.5 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // Check finished products for low stock
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        status: 'IN_STOCK',
      },
    });

    const productStockMap = new Map<string, { total: number, products: any[] }>();
    
    for (const product of products) {
      const key = product.name;
      const quantity = Number(product.quantity);
      
      if (productStockMap.has(key)) {
        const existing = productStockMap.get(key)!;
        existing.total += quantity;
        existing.products.push(product);
      } else {
        productStockMap.set(key, { total: quantity, products: [product] });
      }
    }

    for (const [productName, stockInfo] of productStockMap) {
      const defaultThreshold = 10;
      
      if (stockInfo.total <= defaultThreshold) {
        lowStockItems.push({
          type: 'product',
          name: productName,
          currentStock: stockInfo.total,
          threshold: defaultThreshold,
          unit: 'units',
          severity: stockInfo.total === 0 ? 'CRITICAL' : 
                   stockInfo.total <= defaultThreshold * 0.5 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return NextResponse.json({
      lowStockItems,
      totalItems: lowStockItems.length,
    });
  } catch (error) {
    console.error('Error getting low stock status:', error);
    return NextResponse.json(
      { error: 'Failed to get low stock status' },
      { status: 500 }
    );
  }
}