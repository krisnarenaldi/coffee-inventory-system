import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// POST /api/alerts/check-reorder - Check for reorder conditions and create alerts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const alertsCreated = [];

    // Check ingredients for reorder conditions
    // Reorder when stock is at or below 25% of minimum threshold
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        minimumThreshold: {
          gt: 0,
        },
        isActive: true,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    for (const ingredient of ingredients) {
      const currentStock = Number(ingredient.stockQuantity);
      const threshold = Number(ingredient.minimumThreshold);
      const reorderPoint = threshold * 0.25; // Reorder when at 25% of minimum threshold

      if (currentStock <= reorderPoint) {
        // Check if we already have an unresolved reorder alert for this ingredient
        const existingAlert = await prisma.alert.findFirst({
          where: {
            tenantId,
            type: 'REORDER',
            title: `Reorder Required: ${ingredient.name}`,
            isResolved: false,
          },
        });

        if (!existingAlert) {
          // Calculate suggested reorder quantity (enough to reach 150% of minimum threshold)
          const suggestedQuantity = Math.ceil((threshold * 1.5) - currentStock);
          
          const severity = currentStock === 0 ? 'CRITICAL' : 'HIGH';
          
          let message = `${ingredient.name} requires reordering. Current stock: ${currentStock} ${ingredient.unitOfMeasure}. Suggested order quantity: ${suggestedQuantity} ${ingredient.unitOfMeasure}.`;
          
          if (ingredient.supplier) {
            message += ` Supplier: ${ingredient.supplier.name}`;
            if (ingredient.supplier.email) {
              message += ` (${ingredient.supplier.email})`;
            }
          }

          const alert = await prisma.alert.create({
            data: {
              tenantId,
              type: 'REORDER',
              title: `Reorder Required: ${ingredient.name}`,
              message,
              severity,
            },
          });

          alertsCreated.push({
            ...alert,
            ingredient: {
              id: ingredient.id,
              name: ingredient.name,
              currentStock,
              threshold,
              suggestedQuantity,
              supplier: ingredient.supplier,
            },
          });
        }
      }
    }

    // Check for products that might need restocking based on sales velocity
    // This is a simplified approach - in a real system you'd track sales data
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

    // Check each product type for reorder needs
    for (const [productName, stockInfo] of productStockMap) {
      const reorderThreshold = 5; // Reorder when total stock is 5 or below
      
      if (stockInfo.total <= reorderThreshold) {
        // Check if we already have an unresolved reorder alert for this product
        const existingAlert = await prisma.alert.findFirst({
          where: {
            tenantId,
            type: 'REORDER',
            title: `Production Needed: ${productName}`,
            isResolved: false,
          },
        });

        if (!existingAlert) {
          const suggestedProduction = 20; // Suggest producing 20 units
          const severity = stockInfo.total === 0 ? 'CRITICAL' : 'HIGH';

          const alert = await prisma.alert.create({
            data: {
              tenantId,
              type: 'REORDER',
              title: `Production Needed: ${productName}`,
              message: `${productName} stock is low (${stockInfo.total} units remaining). Consider scheduling a new roast batch. Suggested production: ${suggestedProduction} units.`,
              severity,
            },
          });

          alertsCreated.push({
            ...alert,
            product: {
              name: productName,
              currentStock: stockInfo.total,
              suggestedProduction,
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: `Reorder check completed. ${alertsCreated.length} new alerts created.`,
      alertsCreated: alertsCreated.length,
      alerts: alertsCreated,
    });
  } catch (error) {
    console.error('Error checking reorder conditions:', error);
    return NextResponse.json(
      { error: 'Failed to check reorder conditions' },
      { status: 500 }
    );
  }
}

// GET /api/alerts/check-reorder - Get current reorder recommendations without creating alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const reorderItems = [];

    // Check ingredients for reorder conditions
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        minimumThreshold: {
          gt: 0,
        },
        isActive: true,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    for (const ingredient of ingredients) {
      const currentStock = Number(ingredient.stockQuantity);
      const threshold = Number(ingredient.minimumThreshold);
      const reorderPoint = threshold * 0.25;

      if (currentStock <= reorderPoint) {
        const suggestedQuantity = Math.ceil((threshold * 1.5) - currentStock);
        
        reorderItems.push({
          type: 'ingredient',
          id: ingredient.id,
          name: ingredient.name,
          currentStock,
          threshold,
          reorderPoint,
          suggestedQuantity,
          unit: ingredient.unitOfMeasure,
          supplier: ingredient.supplier,
          severity: currentStock === 0 ? 'CRITICAL' : 'HIGH',
        });
      }
    }

    // Check products for reorder needs
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
      const reorderThreshold = 5;
      
      if (stockInfo.total <= reorderThreshold) {
        const suggestedProduction = 20;
        
        reorderItems.push({
          type: 'product',
          name: productName,
          currentStock: stockInfo.total,
          reorderThreshold,
          suggestedProduction,
          unit: 'units',
          severity: stockInfo.total === 0 ? 'CRITICAL' : 'HIGH',
        });
      }
    }

    return NextResponse.json({
      reorderItems,
      totalItems: reorderItems.length,
    });
  } catch (error) {
    console.error('Error getting reorder recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get reorder recommendations' },
      { status: 500 }
    );
  }
}