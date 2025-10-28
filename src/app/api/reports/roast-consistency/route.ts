import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/reports/roast-consistency - Get roast consistency analysis report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '90'); // days
    const recipeId = searchParams.get('recipeId');
    const roasterId = searchParams.get('roasterId'); // user who performed the roast
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Build where clause for batches
    const where: any = {
      tenantId,
      createdAt: {
        gte: startDate,
      },
      status: 'COMPLETED', // Only analyze completed batches
    };

    if (recipeId) {
      where.recipeId = recipeId;
    }

    if (roasterId) {
      where.createdById = roasterId;
    }

    // Get completed batches with recipe and roaster information
    const batches = await prisma.batch.findMany({
      where,
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            style: true,
            expectedYield: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (batches.length === 0) {
      return NextResponse.json({
        message: 'No completed batches found for the specified criteria',
        summary: null,
        batches: [],
        consistency: null,
        trends: null,
        recommendations: [],
      });
    }

    // Filter out batches without actual yield data for meaningful analysis
    const batchesWithYield = batches.filter(batch => batch.actualYield && batch.actualYield > 0);
    
    if (batchesWithYield.length === 0) {
      return NextResponse.json({
        message: 'No completed batches with yield data found. Please ensure actual yields are recorded for completed batches.',
        summary: null,
        batches: [],
        consistency: null,
        trends: null,
        recommendations: [{
          type: 'missing_yield_data',
          priority: 'high',
          message: 'No actual yield data found for completed batches. Please record actual yields in the batch management system to generate meaningful consistency reports.',
        }],
      });
    }

    // Calculate consistency metrics
    const metrics = batchesWithYield.map(batch => {
      const actualYield = Number(batch.actualYield) || 0;
      const expectedYield = Number(batch.recipe?.expectedYield) || 0;
      // Extract from measurements JSON if available
      const measurements = batch.measurements as any || {};
      const roastLoss = Number(measurements.roastLoss) || 0;
      const roastTime = Number(measurements.roastTime) || 0;
      const roastTemperature = Number(measurements.roastTemperature) || 0;
      const cuppingScore = Number(measurements.cuppingScore) || 0;
      
      const yieldVariance = expectedYield > 0 ? ((actualYield - expectedYield) / expectedYield) * 100 : 0;
      const lossPercentage = (actualYield + roastLoss) > 0 ? (roastLoss / (actualYield + roastLoss)) * 100 : 0;
      
      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        recipeId: batch.recipeId,
        recipeName: batch.recipe?.name || 'Unknown',
        roasterId: batch.createdById,
        roasterName: batch.createdBy?.name || 'Unknown',
        createdAt: batch.createdAt,
        actualYield,
        expectedYield,
        roastLoss,
        roastTime,
        roastTemperature,
        cuppingScore,
        yieldVariance,
        lossPercentage,
        notes: batch.notes,
      };
    });

    // Calculate overall statistics
    const stats = {
      totalBatches: metrics.length,
      averageYield: metrics.reduce((sum, m) => sum + m.actualYield, 0) / metrics.length,
      averageLoss: metrics.reduce((sum, m) => sum + m.roastLoss, 0) / metrics.length,
      averageYieldVariance: metrics.reduce((sum, m) => sum + m.yieldVariance, 0) / metrics.length,
      averageLossPercentage: metrics.reduce((sum, m) => sum + m.lossPercentage, 0) / metrics.length,
      averageRoastTime: metrics.reduce((sum, m) => sum + m.roastTime, 0) / metrics.length,
      averageTemperature: metrics.reduce((sum, m) => sum + m.roastTemperature, 0) / metrics.length,
      averageCuppingScore: metrics.filter(m => m.cuppingScore > 0).reduce((sum, m) => sum + m.cuppingScore, 0) / metrics.filter(m => m.cuppingScore > 0).length || 0,
    };

    // Calculate standard deviations for consistency analysis
    const yieldStdDev = Math.sqrt(
      metrics.reduce((sum, m) => sum + Math.pow(m.actualYield - stats.averageYield, 2), 0) / metrics.length
    );
    
    const lossStdDev = Math.sqrt(
      metrics.reduce((sum, m) => sum + Math.pow(m.roastLoss - stats.averageLoss, 2), 0) / metrics.length
    );
    
    const timeStdDev = Math.sqrt(
      metrics.reduce((sum, m) => sum + Math.pow(m.roastTime - stats.averageRoastTime, 2), 0) / metrics.length
    );
    
    const tempStdDev = Math.sqrt(
      metrics.reduce((sum, m) => sum + Math.pow(m.roastTemperature - stats.averageTemperature, 2), 0) / metrics.length
    );

    // Consistency scoring (lower is better)
    const consistencyScore = {
      yield: {
        stdDev: Math.round(yieldStdDev * 100) / 100,
        coefficient: stats.averageYield > 0 ? (yieldStdDev / stats.averageYield) * 100 : 0,
        rating: yieldStdDev < 0.5 ? 'Excellent' : yieldStdDev < 1.0 ? 'Good' : yieldStdDev < 2.0 ? 'Fair' : 'Poor',
      },
      loss: {
        stdDev: Math.round(lossStdDev * 100) / 100,
        coefficient: stats.averageLoss > 0 ? (lossStdDev / stats.averageLoss) * 100 : 0,
        rating: lossStdDev < 0.3 ? 'Excellent' : lossStdDev < 0.6 ? 'Good' : lossStdDev < 1.0 ? 'Fair' : 'Poor',
      },
      time: {
        stdDev: Math.round(timeStdDev * 100) / 100,
        coefficient: stats.averageRoastTime > 0 ? (timeStdDev / stats.averageRoastTime) * 100 : 0,
        rating: timeStdDev < 30 ? 'Excellent' : timeStdDev < 60 ? 'Good' : timeStdDev < 120 ? 'Fair' : 'Poor',
      },
      temperature: {
        stdDev: Math.round(tempStdDev * 100) / 100,
        coefficient: stats.averageTemperature > 0 ? (tempStdDev / stats.averageTemperature) * 100 : 0,
        rating: tempStdDev < 5 ? 'Excellent' : tempStdDev < 10 ? 'Good' : tempStdDev < 20 ? 'Fair' : 'Poor',
      },
    };

    // Group by recipe for recipe-specific analysis
    const byRecipe = metrics.reduce((acc, metric) => {
      if (!acc[metric.recipeId]) {
        acc[metric.recipeId] = {
          recipeId: metric.recipeId,
          recipeName: metric.recipeName,
          batches: [],
          count: 0,
          averageYield: 0,
          averageLoss: 0,
          yieldConsistency: 0,
          lossConsistency: 0,
        };
      }
      acc[metric.recipeId].batches.push(metric);
      acc[metric.recipeId].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate recipe-specific statistics
    Object.values(byRecipe).forEach((recipe: any) => {
      const recipeBatches = recipe.batches;
      recipe.averageYield = recipeBatches.reduce((sum: number, b: any) => sum + b.actualYield, 0) / recipeBatches.length;
      recipe.averageLoss = recipeBatches.reduce((sum: number, b: any) => sum + b.roastLoss, 0) / recipeBatches.length;
      
      const yieldVariance = Math.sqrt(
        recipeBatches.reduce((sum: number, b: any) => sum + Math.pow(b.actualYield - recipe.averageYield, 2), 0) / recipeBatches.length
      );
      
      const lossVariance = Math.sqrt(
        recipeBatches.reduce((sum: number, b: any) => sum + Math.pow(b.roastLoss - recipe.averageLoss, 2), 0) / recipeBatches.length
      );
      
      recipe.yieldConsistency = recipe.averageYield > 0 ? (yieldVariance / recipe.averageYield) * 100 : 0;
      recipe.lossConsistency = recipe.averageLoss > 0 ? (lossVariance / recipe.averageLoss) * 100 : 0;
    });

    // Group by roaster for roaster performance analysis
    const byRoaster = metrics.reduce((acc, metric) => {
      if (!acc[metric.roasterId]) {
        acc[metric.roasterId] = {
          roasterId: metric.roasterId,
          roasterName: metric.roasterName,
          batches: [],
          count: 0,
          averageYield: 0,
          averageLoss: 0,
          averageCuppingScore: 0,
          consistency: 0,
        };
      }
      acc[metric.roasterId].batches.push(metric);
      acc[metric.roasterId].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate roaster-specific statistics
    Object.values(byRoaster).forEach((roaster: any) => {
      const roasterBatches = roaster.batches;
      roaster.averageYield = roasterBatches.reduce((sum: number, b: any) => sum + b.actualYield, 0) / roasterBatches.length;
      roaster.averageLoss = roasterBatches.reduce((sum: number, b: any) => sum + b.roastLoss, 0) / roasterBatches.length;
      
      const cuppingBatches = roasterBatches.filter((b: any) => b.cuppingScore > 0);
      roaster.averageCuppingScore = cuppingBatches.length > 0 
        ? cuppingBatches.reduce((sum: number, b: any) => sum + b.cuppingScore, 0) / cuppingBatches.length 
        : 0;
      
      const yieldVariance = Math.sqrt(
        roasterBatches.reduce((sum: number, b: any) => sum + Math.pow(b.actualYield - roaster.averageYield, 2), 0) / roasterBatches.length
      );
      
      roaster.consistency = roaster.averageYield > 0 ? (yieldVariance / roaster.averageYield) * 100 : 0;
    });

    // Generate trend analysis (weekly averages)
    const weeklyTrends = [];
    const weeksBack = Math.min(12, Math.ceil(period / 7)); // Up to 12 weeks
    
    for (let i = 0; i < weeksBack; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      
      const weekBatches = metrics.filter(m => {
        const batchDate = new Date(m.createdAt);
        return batchDate >= weekStart && batchDate < weekEnd;
      });
      
      if (weekBatches.length > 0) {
        weeklyTrends.unshift({
          week: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          batchCount: weekBatches.length,
          averageYield: weekBatches.reduce((sum, b) => sum + b.actualYield, 0) / weekBatches.length,
          averageLoss: weekBatches.reduce((sum, b) => sum + b.roastLoss, 0) / weekBatches.length,
          averageYieldVariance: weekBatches.reduce((sum, b) => sum + b.yieldVariance, 0) / weekBatches.length,
        });
      }
    }

    // Generate recommendations
    const recommendations = [];
    
    // Add note about missing data if some batches were excluded
    const excludedBatches = batches.length - batchesWithYield.length;
    if (excludedBatches > 0) {
      recommendations.push({
        type: 'missing_yield_data',
        priority: 'medium',
        message: `${excludedBatches} completed batch(es) were excluded from analysis due to missing actual yield data. Record actual yields for all completed batches to improve report accuracy.`,
      });
    }
    
    if (consistencyScore.yield.rating === 'Poor' || consistencyScore.yield.rating === 'Fair') {
      recommendations.push({
        type: 'yield_consistency',
        priority: 'high',
        message: `Yield consistency needs improvement. Standard deviation is ${consistencyScore.yield.stdDev}kg. Consider reviewing roasting procedures and equipment calibration.`,
      });
    }
    
    if (consistencyScore.loss.rating === 'Poor' || consistencyScore.loss.rating === 'Fair') {
      recommendations.push({
        type: 'loss_consistency',
        priority: 'medium',
        message: `Roast loss varies significantly (${consistencyScore.loss.stdDev}kg std dev). Review temperature and timing controls.`,
      });
    }
    
    if (stats.averageYieldVariance < -10) {
      recommendations.push({
        type: 'yield_below_target',
        priority: 'high',
        message: `Average yield is ${Math.abs(stats.averageYieldVariance).toFixed(1)}% below target. Consider adjusting roast profiles.`,
      });
    }
    
    if (stats.averageLossPercentage > 20) {
      recommendations.push({
        type: 'high_loss',
        priority: 'high',
        message: `Average roast loss is ${stats.averageLossPercentage.toFixed(1)}%, which is high. Review roasting parameters.`,
      });
    }

    // Find best and worst performing recipes/roasters
    const recipePerformance = Object.values(byRecipe)
      .filter((r: any) => r.count >= 3) // Only recipes with at least 3 batches
      .sort((a: any, b: any) => a.yieldConsistency - b.yieldConsistency);
    
    const roasterPerformance = Object.values(byRoaster)
      .filter((r: any) => r.count >= 3) // Only roasters with at least 3 batches
      .sort((a: any, b: any) => a.consistency - b.consistency);

    return NextResponse.json({
      summary: {
        period: period,
        totalBatches: stats.totalBatches,
        dateRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
        },
        averageYield: Math.round(stats.averageYield * 100) / 100,
        averageLoss: Math.round(stats.averageLoss * 100) / 100,
        averageYieldVariance: Math.round(stats.averageYieldVariance * 100) / 100,
        averageLossPercentage: Math.round(stats.averageLossPercentage * 100) / 100,
        averageCuppingScore: Math.round(stats.averageCuppingScore * 100) / 100,
      },
      consistency: consistencyScore,
      byRecipe: Object.values(byRecipe),
      byRoaster: Object.values(byRoaster),
      trends: weeklyTrends,
      performance: {
        bestRecipes: recipePerformance.slice(0, 3),
        worstRecipes: recipePerformance.slice(-3).reverse(),
        bestRoasters: roasterPerformance.slice(0, 3),
        worstRoasters: roasterPerformance.slice(-3).reverse(),
      },
      recommendations,
      batches: metrics,
      filters: {
        period,
        recipeId,
        roasterId,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating roast consistency report:', error);
    return NextResponse.json(
      { error: 'Failed to generate roast consistency report' },
      { status: 500 }
    );
  }
}