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
          
          reportData = `Roast Consistency Report\n\n`;
          reportData += `Period: Last ${period} days\n`;
          reportData += `Generated: ${now.toLocaleDateString()}\n\n`;
          reportData += `Completed Batches: ${roastData.length}\n\n`;
          
          if (roastData.length > 0) {
             reportData += `Roast Details:\n`;
             roastData.forEach((batch: any, index: number) => {
               reportData += `${index + 1}. ${batch.recipe?.name || 'Unknown Recipe'}\n`;
               reportData += `   Quantity: ${batch.quantity} ${batch.unit}\n`;
               reportData += `   Completed: ${batch.updatedAt.toLocaleDateString()}\n\n`;
             });
          } else {
            reportData += `No completed roasts found for the selected period.\n`;
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
          
          reportData = `Yield Analysis Report\n\n`;
          reportData += `Period: Last ${period} days\n`;
          reportData += `Generated: ${now.toLocaleDateString()}\n\n`;
          reportData += `Total Batches Analyzed: ${yieldData.length}\n\n`;
          
          if (yieldData.length > 0) {
             const totalQuantity = yieldData.reduce((sum: number, batch: any) => sum + (batch.quantity || 0), 0);
             const avgQuantity = totalQuantity / yieldData.length;
             
             reportData += `Total Production: ${totalQuantity.toFixed(2)} units\n`;
             reportData += `Average Batch Size: ${avgQuantity.toFixed(2)} units\n\n`;
             
             reportData += `Batch Yields:\n`;
             yieldData.forEach((batch: any, index: number) => {
               reportData += `${index + 1}. ${batch.recipe?.name || 'Unknown Recipe'}\n`;
               reportData += `   Yield: ${batch.quantity} ${batch.unit}\n`;
               reportData += `   Date: ${batch.createdAt.toLocaleDateString()}\n\n`;
             });
          } else {
            reportData += `No yield data found for the selected period.\n`;
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
          
          reportData = `Waste Analysis Report\n\n`;
          reportData += `Period: Last ${period} days\n`;
          reportData += `Generated: ${now.toLocaleDateString()}\n\n`;
          reportData += `Batches Analyzed: ${wasteData.length}\n\n`;
          
          if (wasteData.length > 0) {
             const failedBatches = wasteData.filter((batch: any) => batch.status === 'FAILED');
             const inProgressBatches = wasteData.filter((batch: any) => batch.status === 'IN_PROGRESS');
             
             reportData += `Failed Batches: ${failedBatches.length}\n`;
             reportData += `In Progress Batches: ${inProgressBatches.length}\n`;
             reportData += `Waste Rate: ${((failedBatches.length / wasteData.length) * 100).toFixed(2)}%\n\n`;
             
             if (failedBatches.length > 0) {
               reportData += `Failed Batch Details:\n`;
               failedBatches.forEach((batch: any, index: number) => {
                 reportData += `${index + 1}. ${batch.recipe?.name || 'Unknown Recipe'}\n`;
                 reportData += `   Quantity Lost: ${batch.quantity} ${batch.unit}\n`;
                 reportData += `   Date: ${batch.createdAt.toLocaleDateString()}\n\n`;
               });
            }
          } else {
            reportData += `No waste data found for the selected period.\n`;
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