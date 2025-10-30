import { prisma } from "../prisma";

export interface YieldAnalysisData {
  batchId: string;
  batchNumber: string;
  recipeName: string;
  roasterName: string;
  actualYield: number;
  expectedYield: number;
  yieldEfficiency: number;
  yieldLoss: number;
  createdAt: Date;
}

export interface YieldSummary {
  totalBatches: number;
  averageYieldEfficiency: number;
  averageYieldLoss: number;
  totalYieldLoss: number;
  bestYieldEfficiency: number;
  worstYieldEfficiency: number;
  yieldConsistency: number;
}

export interface YieldTrend {
  week: string;
  batchCount: number;
  averageEfficiency: number;
  totalYieldLoss: number;
}

export interface RecipePerformance {
  recipeName: string;
  batchCount: number;
  averageYieldEfficiency: number;
  totalYieldLoss: number;
  consistency: number;
}

export interface RoasterPerformance {
  roasterName: string;
  batchCount: number;
  averageYieldEfficiency: number;
  totalYieldLoss: number;
  consistency: number;
}

export interface YieldRecommendation {
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  impact: "high" | "medium" | "low";
}

export class YieldAnalysisService {
  static async calculateYieldEfficiency(
    actualYield: number,
    expectedYield: number
  ): Promise<number> {
    if (expectedYield <= 0) return 0;
    return (actualYield / expectedYield) * 100;
  }

  static async calculateYieldLoss(
    actualYield: number,
    expectedYield: number
  ): Promise<number> {
    return Math.max(0, expectedYield - actualYield);
  }

  static async getBatchYieldData(
    tenantId: string,
    periodDays: number,
    recipeId?: string,
    roasterId?: string
  ): Promise<YieldAnalysisData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const whereClause: any = {
      tenantId,
      createdAt: { gte: startDate },
      actualYield: { not: null, gt: 0 },
    };

    if (recipeId) whereClause.recipeId = recipeId;
    if (roasterId) whereClause.createdById = roasterId;

    const batches = await prisma.batch.findMany({
      where: whereClause,
      include: {
        recipe: { select: { id: true, name: true, expectedYield: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return batches.map((batch) => {
      const actualYield = Number(batch.actualYield || 0);
      const expectedYield = Number(batch.recipe?.expectedYield || 0);
      
      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        recipeName: batch.recipe?.name || "Unknown",
        roasterName: batch.createdBy?.name || "Unknown",
        actualYield,
        expectedYield,
        yieldEfficiency: expectedYield > 0 ? (actualYield / expectedYield) * 100 : 0,
        yieldLoss: Math.max(0, expectedYield - actualYield),
        createdAt: batch.createdAt,
      };
    });
  }

  static calculateSummary(yieldData: YieldAnalysisData[]): YieldSummary {
    if (yieldData.length === 0) {
      return {
        totalBatches: 0,
        averageYieldEfficiency: 0,
        averageYieldLoss: 0,
        totalYieldLoss: 0,
        bestYieldEfficiency: 0,
        worstYieldEfficiency: 0,
        yieldConsistency: 0,
      };
    }

    const totalBatches = yieldData.length;
    const averageYieldEfficiency = yieldData.reduce((sum, item) => sum + item.yieldEfficiency, 0) / totalBatches;
    const averageYieldLoss = yieldData.reduce((sum, item) => sum + item.yieldLoss, 0) / totalBatches;
    const totalYieldLoss = yieldData.reduce((sum, item) => sum + item.yieldLoss, 0);
    const bestYieldEfficiency = Math.max(...yieldData.map(item => item.yieldEfficiency));
    const worstYieldEfficiency = Math.min(...yieldData.map(item => item.yieldEfficiency));

    // Calculate consistency (standard deviation)
    const efficiencies = yieldData.map(item => item.yieldEfficiency);
    const variance = efficiencies.reduce((sum, eff) => sum + Math.pow(eff - averageYieldEfficiency, 2), 0) / totalBatches;
    const yieldConsistency = Math.sqrt(variance);

    return {
      totalBatches,
      averageYieldEfficiency: Math.round(averageYieldEfficiency * 100) / 100,
      averageYieldLoss: Math.round(averageYieldLoss * 100) / 100,
      totalYieldLoss: Math.round(totalYieldLoss * 100) / 100,
      bestYieldEfficiency: Math.round(bestYieldEfficiency * 100) / 100,
      worstYieldEfficiency: Math.round(worstYieldEfficiency * 100) / 100,
      yieldConsistency: Math.round(yieldConsistency * 100) / 100,
    };
  }

  static calculateTrends(yieldData: YieldAnalysisData[]): YieldTrend[] {
    const weeklyData = new Map<string, {
      batches: YieldAnalysisData[];
      totalYield: number;
      totalExpected: number;
    }>();

    yieldData.forEach((item) => {
      const weekStart = new Date(item.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          batches: [],
          totalYield: 0,
          totalExpected: 0,
        });
      }

      const weekData = weeklyData.get(weekKey)!;
      weekData.batches.push(item);
      weekData.totalYield += item.actualYield;
      weekData.totalExpected += item.expectedYield;
    });

    const trends: YieldTrend[] = [];
    weeklyData.forEach((data, week) => {
      const efficiency = data.totalExpected > 0 ? (data.totalYield / data.totalExpected) * 100 : 0;
      trends.push({
        week,
        batchCount: data.batches.length,
        averageEfficiency: Math.round(efficiency * 100) / 100,
        totalYieldLoss: Math.round((data.totalExpected - data.totalYield) * 100) / 100,
      });
    });

    return trends.sort((a, b) => a.week.localeCompare(b.week));
  }

  static calculateRecipePerformance(yieldData: YieldAnalysisData[]): RecipePerformance[] {
    const recipeMap = new Map<string, {
      batches: YieldAnalysisData[];
      totalYield: number;
      totalExpected: number;
    }>();

    yieldData.forEach((item) => {
      const key = item.recipeName;
      if (!recipeMap.has(key)) {
        recipeMap.set(key, {
          batches: [],
          totalYield: 0,
          totalExpected: 0,
        });
      }

      const recipeData = recipeMap.get(key)!;
      recipeData.batches.push(item);
      recipeData.totalYield += item.actualYield;
      recipeData.totalExpected += item.expectedYield;
    });

    return Array.from(recipeMap.entries()).map(([recipeName, data]) => ({
      recipeName,
      batchCount: data.batches.length,
      averageYieldEfficiency: data.totalExpected > 0 ? 
        Math.round((data.totalYield / data.totalExpected) * 10000) / 100 : 0,
      totalYieldLoss: Math.round((data.totalExpected - data.totalYield) * 100) / 100,
      consistency: this.calculateConsistency(data.batches.map(b => b.yieldEfficiency)),
    }));
  }

  static calculateRoasterPerformance(yieldData: YieldAnalysisData[]): RoasterPerformance[] {
    const roasterMap = new Map<string, {
      batches: YieldAnalysisData[];
      totalYield: number;
      totalExpected: number;
    }>();

    yieldData.forEach((item) => {
      const key = item.roasterName;
      if (!roasterMap.has(key)) {
        roasterMap.set(key, {
          batches: [],
          totalYield: 0,
          totalExpected: 0,
        });
      }

      const roasterData = roasterMap.get(key)!;
      roasterData.batches.push(item);
      roasterData.totalYield += item.actualYield;
      roasterData.totalExpected += item.expectedYield;
    });

    return Array.from(roasterMap.entries()).map(([roasterName, data]) => ({
      roasterName,
      batchCount: data.batches.length,
      averageYieldEfficiency: data.totalExpected > 0 ? 
        Math.round((data.totalYield / data.totalExpected) * 10000) / 100 : 0,
      totalYieldLoss: Math.round((data.totalExpected - data.totalYield) * 100) / 100,
      consistency: this.calculateConsistency(data.batches.map(b => b.yieldEfficiency)),
    }));
  }

  private static calculateConsistency(efficiencies: number[]): number {
    if (efficiencies.length === 0) return 0;
    
    const mean = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    const variance = efficiencies.reduce((sum, eff) => sum + Math.pow(eff - mean, 2), 0) / efficiencies.length;
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }

  static generateRecommendations(
    summary: YieldSummary,
    recipePerformance: RecipePerformance[],
    roasterPerformance: RoasterPerformance[]
  ): YieldRecommendation[] {
    const recommendations: YieldRecommendation[] = [];

    // Low yield efficiency
    if (summary.averageYieldEfficiency < 85) {
      recommendations.push({
        type: "efficiency",
        priority: "high",
        title: "Low Yield Efficiency Detected",
        message: `Average yield efficiency is ${summary.averageYieldEfficiency}%. Consider reviewing roasting parameters and ingredient quality.`,
        impact: "high",
      });
    }

    // High yield inconsistency
    if (summary.yieldConsistency > 10) {
      recommendations.push({
        type: "consistency",
        priority: "medium",
        title: "Inconsistent Yield Performance",
        message: `Yield consistency shows high variation (±${summary.yieldConsistency}%). Standardize roasting procedures and training.`,
        impact: "medium",
      });
    }

    // Recipe-specific issues
    const poorRecipes = recipePerformance.filter(r => r.averageYieldEfficiency < 80);
    if (poorRecipes.length > 0) {
      recommendations.push({
        type: "recipe",
        priority: "high",
        title: "Underperforming Recipes",
        message: `${poorRecipes.length} recipe(s) have yield efficiency below 80%. Review: ${poorRecipes.map(r => r.recipeName).join(", ")}.`,
        impact: "high",
      });
    }

    // Roaster-specific issues
    const poorRoasters = roasterPerformance.filter(r => r.averageYieldEfficiency < 85);
    if (poorRoasters.length > 0) {
      recommendations.push({
        type: "training",
        priority: "medium",
        title: "Roaster Performance Variation",
        message: `Some roasters show lower yield efficiency. Consider additional training or process standardization.`,
        impact: "medium",
      });
    }

    // High total loss
    if (summary.totalYieldLoss > 50) {
      recommendations.push({
        type: "cost",
        priority: "high",
        title: "Significant Yield Loss",
        message: `Total yield loss of ${summary.totalYieldLoss}kg represents significant cost impact. Prioritize yield optimization.`,
        impact: "high",
      });
    }

    return recommendations;
  }
}