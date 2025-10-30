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
          
        case 'consistency':
          const consistencyData = await prisma.batch.findMany({
            where: {
              tenantId,
              status: 'COMPLETED',
              createdAt: {
                gte: startDate,
                lte: now
              }
            },
            include: { 
              recipe: {
                select: {
                  id: true,
                  name: true,
                  style: true,
                  expectedYield: true
                }
              },
              createdBy: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          });
          
          csvContent += `Batch ID,Recipe Name,Roaster,Expected Yield,Actual Yield,Yield Efficiency (%),Roast Date\n`;
          
          if (consistencyData.length > 0) {
             const batchesWithYield = consistencyData.filter((batch: any) => batch.actualYield && batch.actualYield > 0);
             
             if (batchesWithYield.length > 0) {
               const totalEfficiency = batchesWithYield.reduce((sum: number, batch: any) => {
                 const expectedYield = Number(batch.recipe?.expectedYield || 0);
                 const actualYield = Number(batch.actualYield || 0);
                 const efficiency = expectedYield > 0 ? (actualYield / expectedYield) * 100 : 0;
                 return sum + efficiency;
               }, 0);
               const avgEfficiency = totalEfficiency / batchesWithYield.length;
               
               // Add summary
               csvContent += `Summary,,,,,\n`;
               csvContent += `Total Batches,${batchesWithYield.length},,,,\n`;
               csvContent += `Average Yield Efficiency,${avgEfficiency.toFixed(2)}%,,,,\n`;
               csvContent += `,,,,,\n`;
               csvContent += `Batch Details,,,,,\n`;
               
               batchesWithYield.forEach((batch: any) => {
                 const expectedYield = Number(batch.recipe?.expectedYield || 0);
                 const actualYield = Number(batch.actualYield || 0);
                 const efficiency = expectedYield > 0 ? (actualYield / expectedYield) * 100 : 0;
                 
                 csvContent += `${batch.id},"${batch.recipe?.name || 'Unknown Recipe'}","${batch.createdBy?.name || 'Unknown'}",${expectedYield.toFixed(2)},${actualYield.toFixed(2)},${efficiency.toFixed(2)},${batch.createdAt.toLocaleDateString()}\n`;
               });
             } else {
               csvContent += `No batches with yield data found for the selected period\n`;
             }
          } else {
            csvContent += `No completed batches found for the selected period\n`;
          }
          break;
          
        case 'yield':
          const yieldData = await prisma.batch.findMany({
            where: {
              tenantId,
              createdAt: {
                gte: startDate,
                lte: now
              },
              actualYield: {
                not: null,
                gt: 0
              }
            },
            include: { 
              recipe: {
                select: {
                  id: true,
                  name: true,
                  expectedYield: true
                }
              },
              createdBy: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          });
          
          csvContent += `Batch ID,Recipe Name,Roaster,Expected Yield (kg),Actual Yield (kg),Yield Loss (kg),Yield Efficiency (%),Roast Date\n`;
          
          if (yieldData.length > 0) {
             const totalExpected = yieldData.reduce((sum: number, batch: any) => sum + Number(batch.recipe?.expectedYield || 0), 0);
             const totalActual = yieldData.reduce((sum: number, batch: any) => sum + Number(batch.actualYield || 0), 0);
             const totalLoss = totalExpected - totalActual;
             const avgEfficiency = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;
             
             // Add summary
             csvContent += `Summary,,,,,,,\n`;
             csvContent += `Total Batches,${yieldData.length},,,,,,\n`;
             csvContent += `Total Expected Yield,${totalExpected.toFixed(2)},kg,,,,,\n`;
             csvContent += `Total Actual Yield,${totalActual.toFixed(2)},kg,,,,,\n`;
             csvContent += `Total Yield Loss,${totalLoss.toFixed(2)},kg,,,,,\n`;
             csvContent += `Average Efficiency,${avgEfficiency.toFixed(2)}%,,,,,,\n`;
             csvContent += `,,,,,,,\n`;
             csvContent += `Batch Details,,,,,,,\n`;
             
             yieldData.forEach((batch: any) => {
               const expectedYield = Number(batch.recipe?.expectedYield || 0);
               const actualYield = Number(batch.actualYield || 0);
               const yieldLoss = Math.max(0, expectedYield - actualYield);
               const efficiency = expectedYield > 0 ? (actualYield / expectedYield) * 100 : 0;
               
               csvContent += `${batch.id},"${batch.recipe?.name || 'Unknown Recipe'}","${batch.createdBy?.name || 'Unknown'}",${expectedYield.toFixed(2)},${actualYield.toFixed(2)},${yieldLoss.toFixed(2)},${efficiency.toFixed(2)},${batch.createdAt.toLocaleDateString()}\n`;
             });
          } else {
            csvContent += `No yield data found for the selected period\n`;
          }
          break;
          
        case 'waste':
          const wasteMovements = await prisma.inventoryMovement.findMany({
            where: {
              tenantId,
              type: 'WASTE',
              createdAt: {
                gte: startDate,
                lte: now
              }
            },
            include: {
              ingredient: {
                select: {
                  name: true,
                  unitOfMeasure: true,
                  costPerUnit: true
                }
              },
              createdBy: {
                select: {
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          });
          
          csvContent += `Waste ID,Ingredient Name,Quantity,Unit,Cost Impact (IDR),Reason,Created By,Date\n`;
          
          if (wasteMovements.length > 0) {
             const totalVolume = wasteMovements.reduce((sum: number, movement: any) => sum + Math.abs(movement.quantity), 0);
             const totalCost = wasteMovements.reduce((sum: number, movement: any) => {
               const quantity = Math.abs(movement.quantity);
               const cost = quantity * (movement.ingredient?.costPerUnit || 0);
               return sum + cost;
             }, 0);
             
             // Add summary
             csvContent += `Summary,,,,,,,\n`;
             csvContent += `Total Waste Entries,${wasteMovements.length},,,,,,\n`;
             csvContent += `Total Volume,${totalVolume.toFixed(2)},Mixed Units,,,,,\n`;
             csvContent += `Total Cost Impact,${totalCost.toFixed(0)},IDR,,,,,\n`;
             csvContent += `Average per Entry,${(totalVolume / wasteMovements.length).toFixed(2)},Mixed Units,,,,,\n`;
             csvContent += `,,,,,,,\n`;
             csvContent += `Waste Entry Details,,,,,,,\n`;
             
             wasteMovements.forEach((movement: any) => {
               const quantity = Math.abs(movement.quantity);
               const costImpact = quantity * (movement.ingredient?.costPerUnit || 0);
               const reason = movement.notes || 'No reason specified';
               const createdBy = movement.createdBy?.name || 'Unknown';
               const ingredientName = movement.ingredient?.name || 'Unknown Ingredient';
               const unit = movement.ingredient?.unitOfMeasure || 'units';
               
               csvContent += `${movement.id},"${ingredientName}",${quantity.toFixed(2)},${unit},${costImpact.toFixed(0)},"${reason}","${createdBy}",${movement.createdAt.toLocaleDateString()}\n`;
             });
          } else {
            csvContent += `No waste entries found for the selected period\n`;
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