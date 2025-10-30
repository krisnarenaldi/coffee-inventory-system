import { prisma } from "../prisma";

export interface WasteItem {
  id: string;
  ingredientName: string;
  volume: number;
  cost: number;
  date: Date;
  reason: string;
  type: "direct_waste" | "yield_loss" | "expiration";
  category: "production" | "quality" | "expiration" | "process";
}

export interface WasteCategory {
  category: string;
  name: string;
  volume: number;
  cost: number;
  itemCount: number;
  percentage: number;
}

export interface WasteSummary {
  totalWasteVolume: number;
  totalWasteCost: number;
  wasteItemCount: number;
  averageWastePerItem: number;
}

export interface WasteTrend {
  week: string;
  volume: number;
  cost: number;
  itemCount: number;
}

export interface WasteSource {
  source: string;
  volume: number;
  cost: number;
  itemCount: number;
  percentage: number;
}

export interface WasteRecommendation {
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  impact: "high" | "medium" | "low";
}

export class WasteTrackingService {
  static async getWasteTransactions(
    tenantId: string,
    periodDays: number
  ): Promise<WasteItem[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const transactions = await prisma.inventoryMovement.findMany({
      where: {
        tenantId,
        type: "WASTE",
        createdAt: { gte: startDate },
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
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return transactions.map((transaction) => {
      const volume = Math.abs(Number(transaction.quantity));
      const cost = volume * Number(transaction.ingredient?.costPerUnit || 0);
      
      return {
        id: transaction.id,
        ingredientName: transaction.ingredient?.name || "Unknown",
        volume,
        cost,
        date: transaction.createdAt,
        reason: transaction.notes || "No reason specified",
        type: "direct_waste" as const,
        category: this.categorizeWaste(transaction.notes || ""),
      };
    });
  }

  static async getYieldLossWaste(
    tenantId: string,
    periodDays: number
  ): Promise<WasteItem[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const batches = await prisma.batch.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
        actualYield: { not: null },
      },
      include: {
        recipe: {
          select: { id: true, name: true, expectedYield: true },
        },
      },
    });

    return batches
      .map((batch) => {
        const actualYield = Number(batch.actualYield || 0);
        const expectedYield = Number(batch.recipe?.expectedYield || 0);
        const yieldLoss = expectedYield - actualYield;

        if (yieldLoss <= 0) return null;

        // Estimate cost based on average ingredient cost
        const estimatedCost = yieldLoss * 25; // Rough estimate per kg

        return {
          id: batch.id,
          ingredientName: `${batch.recipe?.name || "Unknown Recipe"} (Yield Loss)`,
          volume: yieldLoss,
          cost: estimatedCost,
          date: batch.createdAt,
          reason: "Lower than expected yield",
          type: "yield_loss" as const,
          category: "process" as const,
        };
      })
      .filter((item): item is WasteItem => item !== null);
  }

  static async getExpirationWaste(
    tenantId: string,
    periodDays: number
  ): Promise<WasteItem[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const expiredIngredients = await prisma.ingredient.findMany({
      where: {
        tenantId,
        expirationDate: {
          gte: startDate,
          lte: new Date(),
        },
        stockQuantity: { gt: 0 },
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

    return expiredIngredients.map((ingredient) => {
      const volume = Number(ingredient.stockQuantity);
      const cost = volume * Number(ingredient.costPerUnit || 0);

      return {
        id: ingredient.id,
        ingredientName: ingredient.name,
        volume,
        cost,
        date: ingredient.expirationDate!,
        reason: "Expired inventory",
        type: "expiration" as const,
        category: "expiration" as const,
      };
    });
  }

  static categorizeWaste(notes: string): "production" | "quality" | "expiration" | "process" {
    const lowerNotes = notes.toLowerCase();
    
    if (lowerNotes.includes("quality") || lowerNotes.includes("defect") || lowerNotes.includes("reject")) {
      return "quality";
    } else if (lowerNotes.includes("expired") || lowerNotes.includes("expiration")) {
      return "expiration";
    } else if (lowerNotes.includes("process") || lowerNotes.includes("roasting") || lowerNotes.includes("loss")) {
      return "process";
    }
    
    return "production";
  }

  static calculateWasteCategories(wasteItems: WasteItem[]): WasteCategory[] {
    const categories = {
      production: { name: "Production Waste", volume: 0, cost: 0, items: [] as WasteItem[] },
      quality: { name: "Quality Control", volume: 0, cost: 0, items: [] as WasteItem[] },
      expiration: { name: "Expiration Waste", volume: 0, cost: 0, items: [] as WasteItem[] },
      process: { name: "Process Loss", volume: 0, cost: 0, items: [] as WasteItem[] },
    };

    wasteItems.forEach((item) => {
      categories[item.category].volume += item.volume;
      categories[item.category].cost += item.cost;
      categories[item.category].items.push(item);
    });

    const totalVolume = Object.values(categories).reduce((sum, cat) => sum + cat.volume, 0);

    return Object.entries(categories).map(([key, data]) => ({
      category: key,
      name: data.name,
      volume: Math.round(data.volume * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      itemCount: data.items.length,
      percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 10000) / 100 : 0,
    }));
  }

  static calculateSummary(wasteItems: WasteItem[]): WasteSummary {
    const totalWasteVolume = wasteItems.reduce((sum, item) => sum + item.volume, 0);
    const totalWasteCost = wasteItems.reduce((sum, item) => sum + item.cost, 0);
    const wasteItemCount = wasteItems.length;
    const averageWastePerItem = wasteItemCount > 0 ? totalWasteVolume / wasteItemCount : 0;

    return {
      totalWasteVolume: Math.round(totalWasteVolume * 100) / 100,
      totalWasteCost: Math.round(totalWasteCost * 100) / 100,
      wasteItemCount,
      averageWastePerItem: Math.round(averageWastePerItem * 100) / 100,
    };
  }

  static calculateTrends(wasteItems: WasteItem[]): WasteTrend[] {
    const weeklyData = new Map<string, {
      volume: number;
      cost: number;
      itemCount: number;
    }>();

    wasteItems.forEach((item) => {
      const weekStart = new Date(item.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { volume: 0, cost: 0, itemCount: 0 });
      }

      const weekData = weeklyData.get(weekKey)!;
      weekData.volume += item.volume;
      weekData.cost += item.cost;
      weekData.itemCount += 1;
    });

    const trends: WasteTrend[] = [];
    weeklyData.forEach((data, week) => {
      trends.push({
        week,
        volume: Math.round(data.volume * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        itemCount: data.itemCount,
      });
    });

    return trends.sort((a, b) => a.week.localeCompare(b.week));
  }

  static calculateSourceAnalysis(wasteItems: WasteItem[]): WasteSource[] {
    const sourceMap = new Map<string, {
      volume: number;
      cost: number;
      itemCount: number;
    }>();

    wasteItems.forEach((item) => {
      const source = item.type;
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { volume: 0, cost: 0, itemCount: 0 });
      }

      const sourceData = sourceMap.get(source)!;
      sourceData.volume += item.volume;
      sourceData.cost += item.cost;
      sourceData.itemCount += 1;
    });

    const totalVolume = wasteItems.reduce((sum, item) => sum + item.volume, 0);

    return Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      volume: Math.round(data.volume * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      itemCount: data.itemCount,
      percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 10000) / 100 : 0,
    }));
  }

  static generateRecommendations(
    summary: WasteSummary,
    categories: WasteCategory[],
    sources: WasteSource[]
  ): WasteRecommendation[] {
    const recommendations: WasteRecommendation[] = [];

    // High total waste cost
    if (summary.totalWasteCost > 1000) {
      recommendations.push({
        type: "cost",
        priority: "high",
        title: "High Waste Cost Impact",
        message: `Total waste cost of $${summary.totalWasteCost.toFixed(2)} represents significant financial impact. Implement waste reduction strategies.`,
        impact: "high",
      });
    }

    // High expiration waste
    const expirationCategory = categories.find(c => c.category === "expiration");
    if (expirationCategory && expirationCategory.cost > 200) {
      recommendations.push({
        type: "inventory",
        priority: "high",
        title: "Excessive Expiration Waste",
        message: `$${expirationCategory.cost.toFixed(2)} lost to expired ingredients. Improve inventory rotation and forecasting.`,
        impact: "high",
      });
    }

    // High quality waste
    const qualityCategory = categories.find(c => c.category === "quality");
    if (qualityCategory && qualityCategory.cost > 300) {
      recommendations.push({
        type: "quality",
        priority: "medium",
        title: "Quality Control Issues",
        message: `$${qualityCategory.cost.toFixed(2)} lost to quality issues. Review quality control processes and supplier standards.`,
        impact: "medium",
      });
    }

    // High process waste
    const processCategory = categories.find(c => c.category === "process");
    if (processCategory && processCategory.cost > 500) {
      recommendations.push({
        type: "process",
        priority: "medium",
        title: "Process Optimization Needed",
        message: `$${processCategory.cost.toFixed(2)} lost to process inefficiencies. Optimize roasting parameters and procedures.`,
        impact: "medium",
      });
    }

    // Dominant waste source
    const topSource = sources.sort((a, b) => b.percentage - a.percentage)[0];
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

  static async getAllWasteData(
    tenantId: string,
    periodDays: number
  ): Promise<{
    summary: WasteSummary;
    categories: WasteCategory[];
    trends: WasteTrend[];
    sources: WasteSource[];
    topItems: WasteItem[];
    recommendations: WasteRecommendation[];
  }> {
    // Fetch all waste data
    const [wasteTransactions, yieldLossWaste, expirationWaste] = await Promise.all([
      this.getWasteTransactions(tenantId, periodDays),
      this.getYieldLossWaste(tenantId, periodDays),
      this.getExpirationWaste(tenantId, periodDays),
    ]);

    const allWasteItems = [...wasteTransactions, ...yieldLossWaste, ...expirationWaste];

    // Calculate metrics
    const summary = this.calculateSummary(allWasteItems);
    const categories = this.calculateWasteCategories(allWasteItems);
    const trends = this.calculateTrends(allWasteItems);
    const sources = this.calculateSourceAnalysis(allWasteItems);
    const recommendations = this.generateRecommendations(summary, categories, sources);

    // Top waste items by cost
    const topItems = allWasteItems
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
      .map(item => ({
        ...item,
        volume: Math.round(item.volume * 100) / 100,
        cost: Math.round(item.cost * 100) / 100,
      }));

    return {
      summary,
      categories,
      trends: trends.slice(-12), // Last 12 weeks
      sources,
      topItems,
      recommendations,
    };
  }
}