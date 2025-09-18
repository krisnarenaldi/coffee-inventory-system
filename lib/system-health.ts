import { prisma } from './prisma';

export interface SystemHealthMetrics {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  responseTime: number;
  errorRate: number;
  databaseStatus: 'connected' | 'disconnected' | 'slow';
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
  lastChecked: string;
}

export interface SystemAlert {
  id: string;
  type: 'database' | 'performance' | 'security' | 'capacity' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheckResult {
  healthy: boolean;
  metrics: SystemHealthMetrics;
  alerts: SystemAlert[];
  recommendations: string[];
}

/**
 * Perform comprehensive system health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const alerts: SystemAlert[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check database connectivity and performance
    const dbHealth = await checkDatabaseHealth();
    
    // Check system performance metrics
    const performanceMetrics = await checkPerformanceMetrics();
    
    // Check error rates
    const errorMetrics = await checkErrorRates();
    
    // Check capacity and usage
    const capacityMetrics = await checkCapacityMetrics();
    
    const responseTime = Date.now() - startTime;
    
    // Determine overall system status
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Database health checks
    if (dbHealth.status === 'disconnected') {
      overallStatus = 'critical';
      alerts.push({
        id: `db_disconnected_${Date.now()}`,
        type: 'database',
        severity: 'critical',
        title: 'Database Connection Lost',
        message: 'Unable to connect to the database. All services may be affected.',
        timestamp: new Date().toISOString(),
        resolved: false
      });
    } else if (dbHealth.status === 'slow') {
      if (overallStatus === 'healthy') overallStatus = 'warning';
      alerts.push({
        id: `db_slow_${Date.now()}`,
        type: 'database',
        severity: 'medium',
        title: 'Database Performance Degraded',
        message: 'Database queries are taking longer than expected.',
        timestamp: new Date().toISOString(),
        resolved: false
      });
      recommendations.push('Consider optimizing database queries or scaling database resources');
    }
    
    // Performance checks
    if (performanceMetrics.cpuUsage > 90) {
      overallStatus = 'critical';
      alerts.push({
        id: `cpu_high_${Date.now()}`,
        type: 'performance',
        severity: 'critical',
        title: 'High CPU Usage',
        message: `CPU usage is at ${performanceMetrics.cpuUsage}%`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { cpuUsage: performanceMetrics.cpuUsage }
      });
    } else if (performanceMetrics.cpuUsage > 75) {
      if (overallStatus === 'healthy') overallStatus = 'warning';
      recommendations.push('Monitor CPU usage and consider scaling resources');
    }
    
    if (performanceMetrics.memoryUsage > 85) {
      if (overallStatus !== 'critical') overallStatus = 'warning';
      alerts.push({
        id: `memory_high_${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        title: 'High Memory Usage',
        message: `Memory usage is at ${performanceMetrics.memoryUsage}%`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { memoryUsage: performanceMetrics.memoryUsage }
      });
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
    }
    
    // Error rate checks
    if (errorMetrics.errorRate > 5) {
      overallStatus = 'critical';
      alerts.push({
        id: `error_rate_high_${Date.now()}`,
        type: 'error_rate',
        severity: 'critical',
        title: 'High Error Rate',
        message: `Error rate is at ${errorMetrics.errorRate}%`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { errorRate: errorMetrics.errorRate }
      });
    } else if (errorMetrics.errorRate > 2) {
      if (overallStatus === 'healthy') overallStatus = 'warning';
      recommendations.push('Investigate recent errors and consider implementing additional error handling');
    }
    
    // Capacity checks
    if (capacityMetrics.activeConnections > 80) {
      if (overallStatus !== 'critical') overallStatus = 'warning';
      alerts.push({
        id: `connections_high_${Date.now()}`,
        type: 'capacity',
        severity: 'medium',
        title: 'High Connection Count',
        message: `Active connections: ${capacityMetrics.activeConnections}`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { activeConnections: capacityMetrics.activeConnections }
      });
      recommendations.push('Monitor connection pooling and consider increasing connection limits');
    }
    
    const metrics: SystemHealthMetrics = {
      status: overallStatus,
      uptime: calculateUptime(),
      responseTime,
      errorRate: errorMetrics.errorRate,
      databaseStatus: dbHealth.status,
      memoryUsage: performanceMetrics.memoryUsage,
      cpuUsage: performanceMetrics.cpuUsage,
      activeConnections: capacityMetrics.activeConnections,
      queueSize: capacityMetrics.queueSize,
      lastChecked: new Date().toISOString()
    };
    
    return {
      healthy: overallStatus === 'healthy',
      metrics,
      alerts,
      recommendations
    };
  } catch (error) {
    console.error('Health check failed:', error);
    
    return {
      healthy: false,
      metrics: {
        status: 'critical',
        uptime: calculateUptime(),
        responseTime: Date.now() - startTime,
        errorRate: 100,
        databaseStatus: 'disconnected',
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        queueSize: 0,
        lastChecked: new Date().toISOString()
      },
      alerts: [{
        id: `health_check_failed_${Date.now()}`,
        type: 'error_rate',
        severity: 'critical',
        title: 'Health Check Failed',
        message: error instanceof Error ? error.message : 'Unknown error during health check',
        timestamp: new Date().toISOString(),
        resolved: false
      }],
      recommendations: ['Investigate system health check failure immediately']
    };
  }
}

/**
 * Check database health and connectivity
 */
async function checkDatabaseHealth(): Promise<{ status: 'connected' | 'disconnected' | 'slow' }> {
  try {
    const startTime = Date.now();
    
    // Simple query to test connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    const queryTime = Date.now() - startTime;
    
    if (queryTime > 1000) {
      return { status: 'slow' };
    }
    
    return { status: 'connected' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'disconnected' };
  }
}

/**
 * Check system performance metrics
 */
async function checkPerformanceMetrics(): Promise<{ cpuUsage: number; memoryUsage: number }> {
  // In a real implementation, you would use system monitoring tools
  // For demo purposes, we'll simulate metrics
  
  const cpuUsage = Math.random() * 100;
  const memoryUsage = Math.random() * 100;
  
  return {
    cpuUsage: Math.round(cpuUsage * 100) / 100,
    memoryUsage: Math.round(memoryUsage * 100) / 100
  };
}

/**
 * Check error rates from recent logs
 */
async function checkErrorRates(): Promise<{ errorRate: number }> {
  // In a real implementation, you would analyze application logs
  // For demo purposes, we'll simulate error rates
  
  const errorRate = Math.random() * 10; // 0-10% error rate
  
  return {
    errorRate: Math.round(errorRate * 100) / 100
  };
}

/**
 * Check system capacity metrics
 */
async function checkCapacityMetrics(): Promise<{ activeConnections: number; queueSize: number }> {
  try {
    // Get active database connections (simplified)
    const activeConnections = Math.floor(Math.random() * 100);
    const queueSize = Math.floor(Math.random() * 50);
    
    return {
      activeConnections,
      queueSize
    };
  } catch (error) {
    return {
      activeConnections: 0,
      queueSize: 0
    };
  }
}

/**
 * Calculate system uptime
 */
function calculateUptime(): string {
  // In a real implementation, you would track actual uptime
  // For demo purposes, we'll simulate high uptime
  
  const uptimePercentage = 99.9 - (Math.random() * 0.5); // 99.4% - 99.9%
  return `${uptimePercentage.toFixed(2)}%`;
}

/**
 * Get recent system alerts
 */
export async function getRecentAlerts(limit: number = 50): Promise<SystemAlert[]> {
  // In a real implementation, you would fetch from a monitoring database
  // For demo purposes, we'll generate some sample alerts
  
  const sampleAlerts: SystemAlert[] = [
    {
      id: 'alert_1',
      type: 'performance',
      severity: 'medium',
      title: 'High Response Time',
      message: 'API response times have increased by 20% in the last hour',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      resolved: true,
      resolvedAt: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
    },
    {
      id: 'alert_2',
      type: 'capacity',
      severity: 'low',
      title: 'Storage Usage Warning',
      message: 'Database storage is at 75% capacity',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      resolved: false
    }
  ];
  
  return sampleAlerts.slice(0, limit);
}

/**
 * Resolve a system alert
 */
export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    // In a real implementation, you would update the alert in the database
    console.log(`Alert ${alertId} marked as resolved`);
    return true;
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    return false;
  }
}

/**
 * Get system health summary for dashboard
 */
export async function getHealthSummary(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  responseTime: number;
  errorRate: number;
  activeAlerts: number;
}> {
  try {
    const healthCheck = await performHealthCheck();
    const recentAlerts = await getRecentAlerts();
    const activeAlerts = recentAlerts.filter(alert => !alert.resolved).length;
    
    return {
      status: healthCheck.metrics.status,
      uptime: healthCheck.metrics.uptime,
      responseTime: healthCheck.metrics.responseTime,
      errorRate: healthCheck.metrics.errorRate,
      activeAlerts
    };
  } catch (error) {
    console.error('Failed to get health summary:', error);
    return {
      status: 'critical',
      uptime: '0%',
      responseTime: 0,
      errorRate: 100,
      activeAlerts: 1
    };
  }
}