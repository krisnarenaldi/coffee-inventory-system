import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "inventory";
    const period = searchParams.get("period") || "90";

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

    // Fetch real data based on tab type
    let reportData = '';
    
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const tenantId = session.user.tenantId;
      
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
          
          reportData = `Inventory Valuation Report\n\n`;
          reportData += `Period: Last ${period} days\n`;
          reportData += `Generated: ${now.toLocaleDateString()}\n\n`;
          reportData += `Total Batches: ${inventoryData.length}\n\n`;
          
          if (inventoryData.length > 0) {
             reportData += `Batch Details:\n`;
             inventoryData.forEach((batch: any, index: number) => {
               const productNames = batch.products?.map((p: any) => p.name).join(', ') || 'No Products';
               reportData += `${index + 1}. ${batch.recipe?.name || 'Unknown Recipe'} - ${productNames}\n`;
               reportData += `   Status: ${batch.status}\n`;
               reportData += `   Batch Number: ${batch.batchNumber}\n`;
               reportData += `   Created: ${batch.createdAt.toLocaleDateString()}\n\n`;
             });
          } else {
            reportData += `No inventory data found for the selected period.\n`;
          }
          break;
          
        case 'roast':
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
          
          reportData = `Roast Consistency Report\n\n`;
          reportData += `Period: Last ${period} days\n`;
          reportData += `Generated: ${now.toLocaleDateString()}\n\n`;
          
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
               
               reportData += `Total Batches Analyzed: ${batchesWithYield.length}\n`;
               reportData += `Average Yield Efficiency: ${avgEfficiency.toFixed(2)}%\n\n`;
               
               // Group by recipe for consistency analysis
               const recipeMap = new Map();
               batchesWithYield.forEach((batch: any) => {
                 const recipeName = batch.recipe?.name || 'Unknown Recipe';
                 if (!recipeMap.has(recipeName)) {
                   recipeMap.set(recipeName, []);
                 }
                 recipeMap.get(recipeName).push(batch);
               });
               
               reportData += `Recipe Performance:\n`;
               recipeMap.forEach((batches, recipeName) => {
                 const recipeEfficiencies = batches.map((batch: any) => {
                   const expectedYield = Number(batch.recipe?.expectedYield || 0);
                   const actualYield = Number(batch.actualYield || 0);
                   return expectedYield > 0 ? (actualYield / expectedYield) * 100 : 0;
                 });
                 
                 const avgRecipeEfficiency = recipeEfficiencies.reduce((sum: number, eff: number) => sum + eff, 0) / recipeEfficiencies.length;
                 const minEfficiency = Math.min(...recipeEfficiencies);
                 const maxEfficiency = Math.max(...recipeEfficiencies);
                 
                 reportData += `\n${recipeName} (${batches.length} batches):\n`;
                 reportData += `  Average Efficiency: ${avgRecipeEfficiency.toFixed(2)}%\n`;
                 reportData += `  Range: ${minEfficiency.toFixed(2)}% - ${maxEfficiency.toFixed(2)}%\n`;
               });
             } else {
               reportData += `No batches with yield data found for analysis.\n`;
             }
          } else {
            reportData += `No completed batches found for the selected period.\n`;
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
          
          reportData = `Yield Analysis Report\n\n`;
          reportData += `Period: Last ${period} days\n`;
          reportData += `Generated: ${now.toLocaleDateString()}\n\n`;
          
          if (yieldData.length > 0) {
             const totalExpected = yieldData.reduce((sum: number, batch: any) => sum + Number(batch.recipe?.expectedYield || 0), 0);
             const totalActual = yieldData.reduce((sum: number, batch: any) => sum + Number(batch.actualYield || 0), 0);
             const totalLoss = totalExpected - totalActual;
             const avgEfficiency = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;
             
             reportData += `Total Batches Analyzed: ${yieldData.length}\n`;
             reportData += `Total Expected Yield: ${totalExpected.toFixed(2)} kg\n`;
             reportData += `Total Actual Yield: ${totalActual.toFixed(2)} kg\n`;
             reportData += `Total Yield Loss: ${totalLoss.toFixed(2)} kg\n`;
             reportData += `Average Efficiency: ${avgEfficiency.toFixed(2)}%\n\n`;
             
             // Group by recipe for yield analysis
             const recipeMap = new Map();
             yieldData.forEach((batch: any) => {
               const recipeName = batch.recipe?.name || 'Unknown Recipe';
               if (!recipeMap.has(recipeName)) {
                 recipeMap.set(recipeName, []);
               }
               recipeMap.get(recipeName).push(batch);
             });
             
             reportData += `Yield Performance by Recipe:\n`;
             recipeMap.forEach((batches, recipeName) => {
               const recipeExpected = batches.reduce((sum: number, batch: any) => sum + Number(batch.recipe?.expectedYield || 0), 0);
               const recipeActual = batches.reduce((sum: number, batch: any) => sum + Number(batch.actualYield || 0), 0);
               const recipeLoss = recipeExpected - recipeActual;
               const recipeEfficiency = recipeExpected > 0 ? (recipeActual / recipeExpected) * 100 : 0;
               
               reportData += `\n${recipeName} (${batches.length} batches):\n`;
               reportData += `  Expected: ${recipeExpected.toFixed(2)} kg\n`;
               reportData += `  Actual: ${recipeActual.toFixed(2)} kg\n`;
               reportData += `  Loss: ${recipeLoss.toFixed(2)} kg\n`;
               reportData += `  Efficiency: ${recipeEfficiency.toFixed(2)}%\n`;
             });
             
             reportData += `\nTop Yield Losses:\n`;
             const sortedBatches = yieldData
               .map((batch: any) => ({
                 name: batch.recipe?.name || 'Unknown Recipe',
                 expected: Number(batch.recipe?.expectedYield || 0),
                 actual: Number(batch.actualYield || 0),
                 loss: Math.max(0, Number(batch.recipe?.expectedYield || 0) - Number(batch.actualYield || 0)),
                 date: batch.createdAt
               }))
               .filter(batch => batch.loss > 0)
               .sort((a, b) => b.loss - a.loss)
               .slice(0, 5);
               
             sortedBatches.forEach((batch, index) => {
               reportData += `${index + 1}. ${batch.name}\n`;
               reportData += `   Loss: ${batch.loss.toFixed(2)} kg\n`;
               reportData += `   Date: ${batch.date.toLocaleDateString()}\n`;
             });
          } else {
            reportData += `No yield data found for the selected period.\n`;
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
          
          reportData = `Waste Tracking Report\n\n`;
          reportData += `Period: Last ${period} days\n`;
          reportData += `Generated: ${now.toLocaleDateString()}\n\n`;
          
          if (wasteMovements.length > 0) {
             const totalVolume = wasteMovements.reduce((sum: number, movement: any) => sum + Math.abs(movement.quantity), 0);
             const totalCost = wasteMovements.reduce((sum: number, movement: any) => {
               const quantity = Math.abs(movement.quantity);
               const cost = quantity * (movement.ingredient?.costPerUnit || 0);
               return sum + cost;
             }, 0);
             
             reportData += `Total Waste Entries: ${wasteMovements.length}\n`;
             reportData += `Total Volume: ${totalVolume.toFixed(2)} (mixed units)\n`;
             reportData += `Total Cost Impact: Rp ${totalCost.toFixed(0)}\n`;
             reportData += `Average per Entry: ${(totalVolume / wasteMovements.length).toFixed(2)} units\n\n`;
             
             // Group by category
             const categories = {
               production: [],
               quality: [],
               expiration: [],
               process: []
             };
             
             wasteMovements.forEach((movement: any) => {
               const notes = movement.notes?.toLowerCase() || '';
               let category = 'production';
               
               if (notes.includes('quality') || notes.includes('defect') || notes.includes('reject')) {
                 category = 'quality';
               } else if (notes.includes('expired') || notes.includes('expiration')) {
                 category = 'expiration';
               } else if (notes.includes('process') || notes.includes('roasting') || notes.includes('loss')) {
                 category = 'process';
               }
               
               categories[category].push(movement);
             });
             
             reportData += `Waste by Category:\n`;
             Object.entries(categories).forEach(([category, movements]) => {
               if (movements.length > 0) {
                 const categoryVolume = movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
                 reportData += `\n${category.toUpperCase()}: ${movements.length} entries, ${categoryVolume.toFixed(2)} units\n`;
                 
                 movements.slice(0, 5).forEach((movement, index) => {
                   const quantity = Math.abs(movement.quantity);
                   const costImpact = quantity * (movement.ingredient?.costPerUnit || 0);
                   reportData += `  ${index + 1}. ${movement.ingredient?.name || 'Unknown'}\n`;
                   reportData += `     Quantity: ${quantity.toFixed(2)} ${movement.ingredient?.unitOfMeasure || 'units'}\n`;
                   reportData += `     Cost: Rp ${costImpact.toFixed(0)}\n`;
                   reportData += `     Date: ${movement.createdAt.toLocaleDateString()}\n`;
                 });
                 
                 if (movements.length > 5) {
                   reportData += `  ... and ${movements.length - 5} more entries\n`;
                 }
               }
             });
          } else {
            reportData += `No waste entries found for the selected period.\n`;
          }
          break;
          
        default:
          reportData = `Report type '${tab}' not supported.\n`;
      }
      
      await prisma.$disconnect();
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      reportData = `Error fetching data: ${dbError instanceof Error ? dbError.message : 'Unknown error'}\n`;
    }

    // Generate PDF with real data
    // Split content into pages (approximately 40 lines per page)
    const lines = reportData.split('\n');
    const linesPerPage = 40;
    const pages = [];
    
    for (let i = 0; i < lines.length; i += linesPerPage) {
      pages.push(lines.slice(i, i + linesPerPage));
    }
    
    // If no pages, create at least one empty page
    if (pages.length === 0) {
      pages.push(['No data available']);
    }
    
    // Generate page objects
    const pageObjects = pages.map((pageLines, index) => {
      const pageNum = index + 3; // Pages start from object 3
      const contentNum = pageNum + pages.length; // Content objects come after page objects
      
      return {
        pageObj: `${pageNum} 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents ${contentNum} 0 R
/Resources <<
/Font <<
/F1 ${3 + pages.length * 2} 0 R
>>
>>
>>
endobj`,
        contentObj: `${contentNum} 0 obj
<<
/Length ${pageLines.join('\n').length + 200}
>>
stream
BT
/F1 10 Tf
50 750 Td
${index === 0 ? `(${tab.charAt(0).toUpperCase() + tab.slice(1)} Report - ${now.toLocaleDateString()}) Tj\n0 -20 Td\n(Period: Last ${period} days) Tj\n0 -30 Td\n` : ''}
${pageLines.map(line => `(${line.replace(/[()\\]/g, '')}) Tj\n0 -15 Td`).join('\n')}
${index < pages.length - 1 ? '0 -30 Td\n(Continued on next page...) Tj' : ''}
ET
endstream
endobj`
      };
    });
    
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [${pages.map((_, i) => `${i + 3} 0 R`).join(' ')}]
/Count ${pages.length}
>>
endobj

${pageObjects.map(p => p.pageObj).join('\n\n')}

${pageObjects.map(p => p.contentObj).join('\n\n')}

${3 + pages.length * 2} 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 ${4 + pages.length * 2}
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
${pageObjects.map((_, i) => `${String(200 + i * 100).padStart(10, '0')} 00000 n`).join(' \n')}
trailer
<<
/Size ${4 + pages.length * 2}
/Root 1 0 R
>>
startxref
${1000 + reportData.length}
%%EOF`;

    const pdfBuffer = Buffer.from(pdfContent, 'utf-8');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${tab}-report-${now.toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}