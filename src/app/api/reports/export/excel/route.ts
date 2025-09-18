import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'inventory';
    const period = searchParams.get('period') || '90';

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90':
        startDate.setDate(now.getDate() - 90);
        break;
      case '365':
        startDate.setDate(now.getDate() - 365);
        break;
      default:
        startDate.setDate(now.getDate() - 90);
    }

    // Fetch real data and generate CSV content
    let csvContent = '';
    
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const tenantId = session.user.tenantId;
      
      // CSV Header
      csvContent = `Report Type,${tab.charAt(0).toUpperCase() + tab.slice(1)} Report\n`;
      csvContent += `Period,Last ${period} days\n`;
      csvContent += `Generated,${now.toLocaleDateString()}\n\n`;
      
      switch (tab) {
        case 'inventory':
          const inventoryData = await prisma.batch.findMany({
            where: {
              tenantId,
              createdAt: {
                gte: startDate,
                lte: now
              }
            },
            include: {
              recipe: true,
              products: true
            },
            orderBy: { createdAt: 'desc' }
          });
          
          csvContent += `Batch ID,Recipe Name,Products,Status,Batch Number,Created Date\n`;
          
          if (inventoryData.length > 0) {
             inventoryData.forEach((batch: any) => {
               const productNames = batch.products?.map((p: any) => p.name).join('; ') || 'No Products';
               csvContent += `${batch.id},"${batch.recipe?.name || 'Unknown Recipe'}","${productNames}",${batch.status},${batch.batchNumber},${batch.createdAt.toLocaleDateString()}\n`;
             });
          } else {
            csvContent += `No inventory data found for the selected period\n`;
          }
          break;
          
        case 'roast':
          const roastData = await prisma.batch.findMany({
            where: {
              tenantId,
              status: 'COMPLETED',
              createdAt: {
                gte: startDate,
                lte: now
              }
            },
            include: { recipe: true },
            orderBy: { createdAt: 'desc' }
          });
          
          csvContent += `Batch ID,Recipe Name,Quantity,Unit,Completed Date\n`;
          
          if (roastData.length > 0) {
             roastData.forEach((batch: any) => {
               csvContent += `${batch.id},"${batch.recipe?.name || 'Unknown Recipe'}",${batch.quantity},${batch.unit},${batch.updatedAt.toLocaleDateString()}\n`;
             });
          } else {
            csvContent += `No completed roasts found for the selected period\n`;
          }
          break;
          
        case 'yield':
          const yieldData = await prisma.batch.findMany({
            where: {
              tenantId,
              createdAt: {
                gte: startDate,
                lte: now
              }
            },
            include: { recipe: true },
            orderBy: { createdAt: 'desc' }
          });
          
          csvContent += `Batch ID,Recipe Name,Yield Quantity,Unit,Production Date\n`;
          
          if (yieldData.length > 0) {
             const totalQuantity = yieldData.reduce((sum: number, batch: any) => sum + (batch.quantity || 0), 0);
             const avgQuantity = totalQuantity / yieldData.length;
             
             // Add summary row
             csvContent += `Summary,,,,\n`;
             csvContent += `Total Production,${totalQuantity.toFixed(2)},units,\n`;
             csvContent += `Average Batch Size,${avgQuantity.toFixed(2)},units,\n`;
             csvContent += `,,,,\n`;
             csvContent += `Batch Details,,,,\n`;
             
             yieldData.forEach((batch: any) => {
               csvContent += `${batch.id},"${batch.recipe?.name || 'Unknown Recipe'}",${batch.quantity},${batch.unit},${batch.createdAt.toLocaleDateString()}\n`;
             });
          } else {
            csvContent += `No yield data found for the selected period\n`;
          }
          break;
          
        case 'waste':
          const wasteData = await prisma.batch.findMany({
            where: {
              tenantId,
              createdAt: {
                gte: startDate,
                lte: now
              }
            },
            include: { recipe: true },
            orderBy: { createdAt: 'desc' }
          });
          
          csvContent += `Batch ID,Recipe Name,Status,Quantity Lost,Unit,Date\n`;
          
          if (wasteData.length > 0) {
             const failedBatches = wasteData.filter((batch: any) => batch.status === 'FAILED');
             const inProgressBatches = wasteData.filter((batch: any) => batch.status === 'IN_PROGRESS');
             const wasteRate = ((failedBatches.length / wasteData.length) * 100).toFixed(2);
             
             // Add summary
             csvContent += `Summary,,,,\n`;
             csvContent += `Total Batches,${wasteData.length},,,\n`;
             csvContent += `Failed Batches,${failedBatches.length},,,\n`;
             csvContent += `In Progress Batches,${inProgressBatches.length},,,\n`;
             csvContent += `Waste Rate,${wasteRate}%,,,\n`;
             csvContent += `,,,,\n`;
             csvContent += `Failed Batch Details,,,,\n`;
             
             if (failedBatches.length > 0) {
               failedBatches.forEach((batch: any) => {
                 csvContent += `${batch.id},"${batch.recipe?.name || 'Unknown Recipe'}",${batch.status},${batch.quantity},${batch.unit},${batch.createdAt.toLocaleDateString()}\n`;
               });
            } else {
              csvContent += `No failed batches found\n`;
            }
          } else {
            csvContent += `No waste data found for the selected period\n`;
          }
          break;
          
        default:
          csvContent += `Error,Report type '${tab}' not supported\n`;
      }
      
      await prisma.$disconnect();
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      csvContent = `Error,Failed to fetch data: ${dbError instanceof Error ? dbError.message : 'Unknown error'}\n`;
    }

    const buffer = Buffer.from(csvContent, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${tab}-report-${now.toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: "Failed to generate Excel" },
      { status: 500 }
    );
  }
}