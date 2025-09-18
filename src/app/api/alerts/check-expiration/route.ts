import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// POST /api/alerts/check-expiration - Check for expiration conditions and create alerts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const alertsCreated = [];
    const now = new Date();
    const warningDays = 7; // Alert 7 days before expiration
    const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

    // Check ingredients for expiration
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        expirationDate: {
          not: null,
          lte: warningDate, // Expiring within warning period
        },
        isActive: true,
      },
    });

    for (const ingredient of ingredients) {
      if (!ingredient.expirationDate) continue;

      const daysUntilExpiration = Math.ceil(
        (ingredient.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we already have an unresolved expiration alert for this ingredient
      const existingAlert = await prisma.alert.findFirst({
        where: {
          tenantId,
          type: 'EXPIRATION',
          title: `Expiring Soon: ${ingredient.name}`,
          isResolved: false,
        },
      });

      if (!existingAlert) {
        const isExpired = daysUntilExpiration <= 0;
        const severity = isExpired ? 'CRITICAL' : 
                        daysUntilExpiration <= 2 ? 'HIGH' : 'MEDIUM';

        const message = isExpired 
          ? `${ingredient.name} has expired on ${ingredient.expirationDate.toLocaleDateString()}. Current stock: ${ingredient.stockQuantity} ${ingredient.unitOfMeasure}.`
          : `${ingredient.name} will expire in ${daysUntilExpiration} day(s) on ${ingredient.expirationDate.toLocaleDateString()}. Current stock: ${ingredient.stockQuantity} ${ingredient.unitOfMeasure}.`;

        const alert = await prisma.alert.create({
          data: {
            tenantId,
            type: 'EXPIRATION',
            title: `${isExpired ? 'Expired' : 'Expiring Soon'}: ${ingredient.name}`,
            message,
            severity,
          },
        });

        alertsCreated.push(alert);
      }
    }

    // Check finished products for expiration (based on roast date + shelf life)
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        status: 'IN_STOCK',
        packagingDate: {
          not: null,
        },
        shelfLife: {
          not: null,
        },
      },
    });

    for (const product of products) {
      if (!product.packagingDate || !product.shelfLife) continue;

      // Calculate expiration date based on packaging date + shelf life (in days)
      const expirationDate = new Date(
        product.packagingDate.getTime() + Number(product.shelfLife) * 24 * 60 * 60 * 1000
      );

      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only alert if expiring within warning period
      if (daysUntilExpiration <= warningDays) {
        // Check if we already have an unresolved expiration alert for this product
        const existingAlert = await prisma.alert.findFirst({
          where: {
            tenantId,
            type: 'EXPIRATION',
            title: `Expiring Soon: ${product.name} (Lot: ${product.lotNumber})`,
            isResolved: false,
          },
        });

        if (!existingAlert) {
          const isExpired = daysUntilExpiration <= 0;
          const severity = isExpired ? 'CRITICAL' : 
                          daysUntilExpiration <= 2 ? 'HIGH' : 'MEDIUM';

          const message = isExpired 
            ? `${product.name} (Lot: ${product.lotNumber}) has expired on ${expirationDate.toLocaleDateString()}. Current stock: ${product.quantity} units.`
            : `${product.name} (Lot: ${product.lotNumber}) will expire in ${daysUntilExpiration} day(s) on ${expirationDate.toLocaleDateString()}. Current stock: ${product.quantity} units.`;

          const alert = await prisma.alert.create({
            data: {
              tenantId,
              type: 'EXPIRATION',
              title: `${isExpired ? 'Expired' : 'Expiring Soon'}: ${product.name} (Lot: ${product.lotNumber})`,
              message,
              severity,
            },
          });

          alertsCreated.push(alert);
        }
      }
    }

    return NextResponse.json({
      message: `Expiration check completed. ${alertsCreated.length} new alerts created.`,
      alertsCreated: alertsCreated.length,
      alerts: alertsCreated,
    });
  } catch (error) {
    console.error('Error checking expiration:', error);
    return NextResponse.json(
      { error: 'Failed to check expiration' },
      { status: 500 }
    );
  }
}

// GET /api/alerts/check-expiration - Get current expiration status without creating alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const expiringItems = [];
    const now = new Date();
    const warningDays = 7;
    const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

    // Check ingredients for expiration
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        expirationDate: {
          not: null,
          lte: warningDate,
        },
        isActive: true,
      },
    });

    for (const ingredient of ingredients) {
      if (!ingredient.expirationDate) continue;

      const daysUntilExpiration = Math.ceil(
        (ingredient.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expiringItems.push({
        type: 'ingredient',
        id: ingredient.id,
        name: ingredient.name,
        expirationDate: ingredient.expirationDate,
        daysUntilExpiration,
        currentStock: Number(ingredient.stockQuantity),
        unit: ingredient.unitOfMeasure,
        severity: daysUntilExpiration <= 0 ? 'CRITICAL' : 
                 daysUntilExpiration <= 2 ? 'HIGH' : 'MEDIUM',
      });
    }

    // Check finished products for expiration
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        status: 'IN_STOCK',
        packagingDate: {
          not: null,
        },
        shelfLife: {
          not: null,
        },
      },
    });

    for (const product of products) {
      if (!product.packagingDate || !product.shelfLife) continue;

      const expirationDate = new Date(
        product.packagingDate.getTime() + Number(product.shelfLife) * 24 * 60 * 60 * 1000
      );

      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration <= warningDays) {
        expiringItems.push({
          type: 'product',
          id: product.id,
          name: product.name,
          lotNumber: product.lotNumber,
          expirationDate,
          daysUntilExpiration,
          currentStock: Number(product.quantity),
          unit: 'units',
          severity: daysUntilExpiration <= 0 ? 'CRITICAL' : 
                   daysUntilExpiration <= 2 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return NextResponse.json({
      expiringItems,
      totalItems: expiringItems.length,
    });
  } catch (error) {
    console.error('Error getting expiration status:', error);
    return NextResponse.json(
      { error: 'Failed to get expiration status' },
      { status: 500 }
    );
  }
}