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
    const recipeId = searchParams.get("recipeId");
    const roasterId = searchParams.get("roasterId");

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Build where clause
    const whereClause: any = {
      tenantId: session.user.tenantId,
      createdAt: {
        gte: startDate,
      },
      actualYield: {
        not: null,
        gt: 0,
      },
    };

    if (recipeId) {
      whereClause.recipeId = recipeId;
    }

    if (roasterId) {
      whereClause.createdById = roasterId;
    }

    // Fetch batches with yield data
    const batches = await prisma.batch.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    if (batches.length === 0) {
      return NextResponse.json({
        summary: {
          totalBatches: 0,
          averageYieldEfficiency: 0,
          averageYieldLoss: 0,
          totalYieldLoss: 0,
          bestYieldEfficiency: 0,
          worstYieldEfficiency: 0,
          yieldConsistency: 0,
        },
        trends: [],
        byRecipe: [],
        byRoaster: [],
        recommendations: [],
        batches: [],
      });
    }

    // Calculate yield metrics
    const yieldData = batches.map((batch) => {
      const actualYield = Number(batch.actualYield || 0);
      const expectedYield = Number(batch.recipe?.expectedYield || 0);
      const yieldEfficiency = expectedYield > 0 ? (actualYield / expectedYield) * 100 : 0;
      const yieldLoss = expectedYield - actualYield;

      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        recipeName: batch.recipe?.name || "Unknown",
        roasterName: batch.createdBy?.name || "Unknown",
        actualYield,
        expectedYield,
        yieldEfficiency,
        yieldLoss,
        createdAt: batch.createdAt,
      };
    });

    // Summary calculations
    const totalBatches = yieldData.length;
    const averageYieldEfficiency = yieldData.reduce((sum, item) => sum + item.yieldEfficiency, 0) / totalBatches;
    const averageYieldLoss = yieldData.reduce((sum, item) => sum + item.yieldLoss, 0) / totalBatches;
    const totalYieldLoss = yieldData.reduce((sum, item) => sum + item.yieldLoss, 0);
    const bestYieldEfficiency = Math.max(...yieldData.map(item => item.yieldEfficiency));
    const worstYieldEfficiency = Math.min(...yieldData.map(item => item.yieldEfficiency));

    // Calculate yield consistency (standard deviation)
    const efficiencies = yieldData.map(item => item.yieldEfficiency);
    const mean = averageYieldEfficiency;
    const variance = efficiencies.reduce((sum, eff) => sum + Math.pow(eff - mean, 2), 0) / totalBatches;
    const yieldConsistency = Math.sqrt(variance);

    // Trends by week
    const trends = [];
    const weeklyData = new Map();

    yieldData.forEach((item) => {
      const weekStart = new Date(item.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          week: weekKey,
          batches: [],
          totalYield: 0,
          totalExpected: 0,
        });
      }

      const weekData = weeklyData.get(weekKey);
      weekData.batches.push(item);
      weekData.totalYield += item.actualYield;
      weekData.totalExpected += item.expectedYield;
    });

    weeklyData.forEach((data, week) => {
      const efficiency = data.totalExpected > 0 ? (data.totalYield / data.totalExpected) * 100 : 0;
      trends.push({
        week,
        batchCount: data.batches.length,
        averageEfficiency: efficiency,
        totalYieldLoss: data.totalExpected - data.totalYield,
      });
    });

    trends.sort((a, b) => a.week.localeCompare(b.week));

    // Performance by recipe
    const recipeMap = new Map();
    yieldData.forEach((item) => {
      const key = item.recipeName;
      if (!recipeMap.has(key)) {
        recipeMap.set(key, {
          recipeName: key,
          batches: [],
          totalYield: 0,
          totalExpected: 0,
        });
      }

      const recipeData = recipeMap.get(key);
      recipeData.batches.push(item);
      recipeData.totalYield += item.actualYield;
      recipeData.totalExpected += item.expectedYield;
    });

    const byRecipe = Array.from(recipeMap.values()).map((data) => ({
      recipeName: data.recipeName,
      batchCount: data.batches.length,
      averageYieldEfficiency: data.totalExpected > 0 ? (data.totalYield / data.totalExpected) * 100 : 0,
      totalYieldLoss: data.totalExpected - data.totalYield,
      consistency: calculateConsistency(data.batches.map(b => b.yieldEfficiency)),
    }));

    // Performance by roaster
    const roasterMap = new Map();
    yieldData.forEach((item) => {
      const key = item.roasterName;
      if (!roasterMap.has(key)) {
        roasterMap.set(key, {
          roasterName: key,
          batches: [],
          totalYield: 0,
          totalExpected: 0,
        });
      }

      const roasterData = roasterMap.get(key);
      roasterData.batches.push(item);
      roasterData.totalYield += item.actualYield;
      roasterData.totalExpected += item.expectedYield;
    });

    const byRoaster = Array.from(roasterMap.values()).map((data) => ({
      roasterName: data.roasterName,
      batchCount: data.batches.length,
      averageYieldEfficiency: data.totalExpected > 0 ? (data.totalYield / data.totalExpected) * 100 : 0,
      totalYieldLoss: data.totalExpected - data.totalYield,
      consistency: calculateConsistency(data.batches.map(b => b.yieldEfficiency)),
    }));

    // Generate recommendations
    const recommendations = generateYieldRecommendations({
      averageYieldEfficiency,
      yieldConsistency,
      byRecipe,
      byRoaster,
      totalYieldLoss,
    });

    return NextResponse.json({
      summary: {
        totalBatches,
        averageYieldEfficiency: Math.round(averageYieldEfficiency * 100) / 100,
        averageYieldLoss: Math.round(averageYieldLoss * 100) / 100,
        totalYieldLoss: Math.round(totalYieldLoss * 100) / 100,
        bestYieldEfficiency: Math.round(bestYieldEfficiency * 100) / 100,
        worstYieldEfficiency: Math.round(worstYieldEfficiency * 100) / 100,
        yieldConsistency: Math.round(yieldConsistency * 100) / 100,
      },
      trends: trends.slice(-12), // Last 12 weeks
      byRecipe: byRecipe.sort((a, b) => b.averageYieldEfficiency - a.averageYieldEfficiency),
      byRoaster: byRoaster.sort((a, b) => b.averageYieldEfficiency - a.averageYieldEfficiency),
      recommendations,
      batches: yieldData.slice(0, 20), // Recent 20 batches
    });

  } catch (error) {
    console.error("Error fetching yield analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch yield analysis" },
      { status: 500 }
    );
  }
}

function calculateConsistency(efficiencies: number[]): number {
  if (efficiencies.length === 0) return 0;
  
  const mean = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
  const variance = efficiencies.reduce((sum, eff) => sum + Math.pow(eff - mean, 2), 0) / efficiencies.length;
  return Math.sqrt(variance);
}

function generateYieldRecommendations(data: any): any[] {
  const recommendations = [];

  // Low yield efficiency
  if (data.averageYieldEfficiency < 85) {
    recommendations.push({
      type: "efficiency",
      priority: "high",
      title: "Low Yield Efficiency Detected",
      message: `Average yield efficiency is ${data.averageYieldEfficiency.toFixed(1)}%. Consider reviewing roasting parameters and ingredient quality.`,
      impact: "high",
    });
  }

  // High yield inconsistency
  if (data.yieldConsistency > 10) {
    recommendations.push({
      type: "consistency",
      priority: "medium",
      title: "Inconsistent Yield Performance",
      message: `Yield consistency shows high variation (±${data.yieldConsistency.toFixed(1)}%). Standardize roasting procedures and training.`,
      impact: "medium",
    });
  }

  // Recipe-specific issues
  const poorRecipes = data.byRecipe.filter((r: any) => r.averageYieldEfficiency < 80);
  if (poorRecipes.length > 0) {
    recommendations.push({
      type: "recipe",
      priority: "high",
      title: "Underperforming Recipes",
      message: `${poorRecipes.length} recipe(s) have yield efficiency below 80%. Review: ${poorRecipes.map((r: any) => r.recipeName).join(", ")}.`,
      impact: "high",
    });
  }

  // Roaster-specific issues
  const poorRoasters = data.byRoaster.filter((r: any) => r.averageYieldEfficiency < 85);
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
  if (data.totalYieldLoss > 50) {
    recommendations.push({
      type: "cost",
      priority: "high",
      title: "Significant Yield Loss",
      message: `Total yield loss of ${data.totalYieldLoss.toFixed(1)}kg represents significant cost impact. Prioritize yield optimization.`,
      impact: "high",
    });
  }

  return recommendations;
}