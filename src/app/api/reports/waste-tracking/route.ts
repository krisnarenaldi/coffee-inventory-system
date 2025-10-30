import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "90";
    const category = searchParams.get("category");

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch waste transactions (WASTE type inventory movements)
    const wasteTransactions = await prisma.inventoryMovement.findMany({
      where: {
        tenantId: session.user.tenantId,
        type: "WASTE",
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            type: true,
            costPerUnit: true,
            unitOfMeasure: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch yield losses from batches
    const batches = await prisma.batch.findMany({
      where: {
        tenantId: session.user.tenantId,
        createdAt: {
          gte: startDate,
        },
        actualYield: {
          not: null,
        },
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            expectedYield: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Fetch expired ingredients
    const expiredIngredients = await prisma.ingredient.findMany({
      where: {
        tenantId: session.user.tenantId,
        expirationDate: {
          gte: startDate,
          lte: new Date(),
        },
        stockQuantity: {
          gt: 0,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        stockQuantity: true,
        costPerUnit: true,
        unitOfMeasure: true,
        expirationDate: true,
      },
    });

    // Calculate waste categories
    const wasteCategories = {
      production: {
        name: "Production Waste",
        volume: 0,
        cost: 0,
        items: [],
      },
      quality: {
        name: "Quality Control",
        volume: 0,
        cost: 0,
        items: [],
      },
      expiration: {
        name: "Expiration Waste",
        volume: 0,
        cost: 0,
        items: [],
      },
      process: {
        name: "Process Loss",
        volume: 0,
        cost: 0,
        items: [],
      },
    };

    // Process waste transactions
    wasteTransactions.forEach((transaction) => {
      const volume = Math.abs(Number(transaction.quantity));
      const cost = volume * Number(transaction.ingredient?.costPerUnit || 0);
      
      // Categorize based on notes or default to production
      let category = "production";
      const notes = transaction.notes?.toLowerCase() || "";
      
      if (notes.includes("quality") || notes.includes("defect") || notes.includes("reject")) {
        category = "quality";
      } else if (notes.includes("expired") || notes.includes("expiration")) {
        category = "expiration";
      } else if (notes.includes("process") || notes.includes("roasting") || notes.includes("loss")) {
        category = "process";
      }

      wasteCategories[category as keyof typeof wasteCategories].volume += volume;
      wasteCategories[category as keyof typeof wasteCategories].cost += cost;
      wasteCategories[category as keyof typeof wasteCategories].items.push({
        id: transaction.id,
        ingredientName: transaction.ingredient?.name || "Unknown",
        volume,
        cost,
        date: transaction.createdAt,
        reason: transaction.notes || "No reason specified",
        type: "direct_waste",
      });
    });

    // Process yield losses as process waste
    batches.forEach((batch) => {
      const actualYield = Number(batch.actualYield || 0);
      const expectedYield = Number(batch.recipe?.expectedYield || 0);
      const yieldLoss = expectedYield - actualYield;

      if (yieldLoss > 0) {
        // Estimate cost based on average ingredient cost (simplified)
        const estimatedCost = yieldLoss * 25; // Rough estimate per kg

        wasteCategories.process.volume += yieldLoss;
        wasteCategories.process.cost += estimatedCost;
        wasteCategories.process.items.push({
          id: batch.id,
          ingredientName: `${batch.recipe?.name || "Unknown Recipe"} (Yield Loss)`,
          volume: yieldLoss,
          cost: estimatedCost,
          date: batch.createdAt,
          reason: "Lower than expected yield",
          type: "yield_loss",
        });
      }
    });

    // Process expired ingredients
    expiredIngredients.forEach((ingredient) => {
      const volume = Number(ingredient.stockQuantity);
      const cost = volume * Number(ingredient.costPerUnit || 0);

      wasteCategories.expiration.volume += volume;
      wasteCategories.expiration.cost += cost;
      wasteCategories.expiration.items.push({
        id: ingredient.id,
        ingredientName: ingredient.name,
        volume,
        cost,
        date: ingredient.expirationDate,
        reason: "Expired inventory",
        type: "expiration",
      });
    });

    // Calculate totals
    const totalWasteVolume = Object.values(wasteCategories).reduce((sum, cat) => sum + cat.volume, 0);
    const totalWasteCost = Object.values(wasteCategories).reduce((sum, cat) => sum + cat.cost, 0);

    // Calculate trends by week
    const trends = [];
    const weeklyData = new Map();

    // Combine all waste items for trending
    const allWasteItems = Object.values(wasteCategories).flatMap(cat => cat.items);

    allWasteItems.forEach((item) => {
      const weekStart = new Date(item.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          week: weekKey,
          volume: 0,
          cost: 0,
          itemCount: 0,
        });
      }

      const weekData = weeklyData.get(weekKey);
      weekData.volume += item.volume;
      weekData.cost += item.cost;
      weekData.itemCount += 1;
    });

    weeklyData.forEach((data, week) => {
      trends.push({
        week,
        volume: Math.round(data.volume * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        itemCount: data.itemCount,
      });
    });

    trends.sort((a, b) => a.week.localeCompare(b.week));

    // Waste by source analysis
    const sourceAnalysis = new Map();
    
    allWasteItems.forEach((item) => {
      const source = item.type;
      if (!sourceAnalysis.has(source)) {
        sourceAnalysis.set(source, {
          source,
          volume: 0,
          cost: 0,
          itemCount: 0,
        });
      }

      const sourceData = sourceAnalysis.get(source);
      sourceData.volume += item.volume;
      sourceData.cost += item.cost;
      sourceData.itemCount += 1;
    });

    const bySources = Array.from(sourceAnalysis.values()).map(data => ({
      source: data.source,
      volume: Math.round(data.volume * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      itemCount: data.itemCount,
      percentage: totalWasteVolume > 0 ? (data.volume / totalWasteVolume) * 100 : 0,
    }));

    // Generate waste reduction recommendations
    const recommendations = generateWasteRecommendations({
      totalWasteVolume,
      totalWasteCost,
      wasteCategories,
      bySources,
    });

    // Top waste items
    const topWasteItems = allWasteItems
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
      .map(item => ({
        ...item,
        volume: Math.round(item.volume * 100) / 100,
        cost: Math.round(item.cost * 100) / 100,
      }));

    // Get unit breakdown from actual waste transactions
    const unitBreakdown = new Map();
    
    // Process waste transactions for unit breakdown
    wasteTransactions.forEach((transaction) => {
      const unit = transaction.ingredient?.unitOfMeasure || "units";
      const volume = Math.abs(Number(transaction.quantity));
      
      if (!unitBreakdown.has(unit)) {
        unitBreakdown.set(unit, { volume: 0, count: 0 });
      }
      
      const unitData = unitBreakdown.get(unit);
      unitData.volume += volume;
      unitData.count += 1;
    });

    const unitSummary = Array.from(unitBreakdown.entries()).map(([unit, data]) => ({
      unit,
      volume: Math.round(data.volume * 100) / 100,
      count: data.count,
    }));

    return NextResponse.json({
      summary: {
        totalWasteVolume: Math.round(totalWasteVolume * 100) / 100,
        totalWasteCost: Math.round(totalWasteCost * 100) / 100,
        wasteItemCount: allWasteItems.length,
        averageWastePerItem: allWasteItems.length > 0 ? Math.round((totalWasteVolume / allWasteItems.length) * 100) / 100 : 0,
        unitBreakdown: unitSummary,
      },
      categories: Object.entries(wasteCategories).map(([key, data]) => ({
        category: key,
        name: data.name,
        volume: Math.round(data.volume * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        itemCount: data.items.length,
        percentage: totalWasteVolume > 0 ? (data.volume / totalWasteVolume) * 100 : 0,
      })),
      trends: trends.slice(-12), // Last 12 weeks
      bySources,
      topWasteItems,
      recommendations,
    });

  } catch (error) {
    console.error("Error fetching waste tracking data:", error);
    return NextResponse.json(
      { error: "Failed to fetch waste tracking data" },
      { status: 500 }
    );
  }
}

function generateWasteRecommendations(data: any): any[] {
  const recommendations = [];

  // High total waste
  if (data.totalWasteCost > 1000) {
    recommendations.push({
      type: "cost",
      priority: "high",
      title: "High Waste Cost Impact",
      message: `Total waste cost of $${data.totalWasteCost.toFixed(2)} represents significant financial impact. Implement waste reduction strategies.`,
      impact: "high",
    });
  }

  // High expiration waste
  const expirationWaste = data.wasteCategories.expiration;
  if (expirationWaste.cost > 200) {
    recommendations.push({
      type: "inventory",
      priority: "high",
      title: "Excessive Expiration Waste",
      message: `$${expirationWaste.cost.toFixed(2)} lost to expired ingredients. Improve inventory rotation and forecasting.`,
      impact: "high",
    });
  }

  // High quality waste
  const qualityWaste = data.wasteCategories.quality;
  if (qualityWaste.cost > 300) {
    recommendations.push({
      type: "quality",
      priority: "medium",
      title: "Quality Control Issues",
      message: `$${qualityWaste.cost.toFixed(2)} lost to quality issues. Review quality control processes and supplier standards.`,
      impact: "medium",
    });
  }

  // High process waste
  const processWaste = data.wasteCategories.process;
  if (processWaste.cost > 500) {
    recommendations.push({
      type: "process",
      priority: "medium",
      title: "Process Optimization Needed",
      message: `$${processWaste.cost.toFixed(2)} lost to process inefficiencies. Optimize roasting parameters and procedures.`,
      impact: "medium",
    });
  }

  // Dominant waste source
  const topSource = data.bySources.sort((a: any, b: any) => b.percentage - a.percentage)[0];
  if (topSource && topSource.percentage > 50) {
    recommendations.push({
      type: "focus",
      priority: "medium",
      title: "Focus on Primary Waste Source",
      message: `${topSource.source} accounts for ${topSource.percentage.toFixed(1)}% of waste. Prioritize improvements in this area.`,
      impact: "medium",
    });
  }

  return recommendations;
}