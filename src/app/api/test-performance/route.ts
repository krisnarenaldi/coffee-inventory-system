import { NextRequest, NextResponse } from "next/server";
import { measureAsync, performanceMonitor } from "../../../../lib/performance-monitor";

export async function GET(request: NextRequest) {
  // Test the performance monitoring system
  const result = await measureAsync(
    "test_api_call",
    async () => {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
      
      return {
        message: "Performance test completed",
        timestamp: new Date().toISOString(),
        randomDelay: "100-600ms",
      };
    },
    {
      testType: "performance_monitoring",
      userAgent: request.headers.get("user-agent"),
    }
  );

  // Add some additional metrics for testing
  performanceMonitor.recordMetric({
    name: "manual_test_metric",
    duration: Math.random() * 1000 + 50,
    timestamp: new Date(),
    metadata: {
      type: "manual_test",
      source: "test_api",
    },
  });

  return NextResponse.json({
    ...result,
    performanceStats: performanceMonitor.getStats("test_api_call"),
    totalMetrics: performanceMonitor.getStats(),
  });
}
