import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { performanceMonitor } from "../../../../../lib/performance-monitor";
import { cache } from "../../../../../lib/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow platform admins to access performance data
    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metricName = searchParams.get("metric");

    // Get performance statistics
    const stats = performanceMonitor.getStats(metricName || undefined);
    const slowOperations = performanceMonitor.getSlowOperations(1000);
    const metricNames = performanceMonitor.getMetricNames();
    const cacheStats = cache.getStats();

    // Get system metrics
    const systemMetrics = {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
      },
      uptime: Math.round(process.uptime()), // seconds
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    return NextResponse.json({
      performance: {
        stats,
        slowOperations,
        metricNames,
      },
      cache: cacheStats,
      system: systemMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Performance API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Clear performance metrics (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    performanceMonitor.clear();
    cache.clear();

    return NextResponse.json({ 
      message: "Performance metrics and cache cleared successfully" 
    });
  } catch (error) {
    console.error("Performance clear error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
