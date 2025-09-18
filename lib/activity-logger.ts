import { prisma } from './prisma';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

// Activity types for different actions
export enum ActivityType {
  // Authentication
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTER = 'USER_REGISTER',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_INVITED = 'USER_INVITED',
  
  // Inventory Management
  INGREDIENT_CREATED = 'INGREDIENT_CREATED',
  INGREDIENT_UPDATED = 'INGREDIENT_UPDATED',
  INGREDIENT_DELETED = 'INGREDIENT_DELETED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  
  // Recipe Management
  RECIPE_CREATED = 'RECIPE_CREATED',
  RECIPE_UPDATED = 'RECIPE_UPDATED',
  RECIPE_DELETED = 'RECIPE_DELETED',
  RECIPE_DUPLICATED = 'RECIPE_DUPLICATED',
  
  // Batch Management
  BATCH_CREATED = 'BATCH_CREATED',
  BATCH_UPDATED = 'BATCH_UPDATED',
  BATCH_DELETED = 'BATCH_DELETED',
  BATCH_STATUS_CHANGED = 'BATCH_STATUS_CHANGED',
  
  // Product Management
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  
  // Supplier Management
  SUPPLIER_CREATED = 'SUPPLIER_CREATED',
  SUPPLIER_UPDATED = 'SUPPLIER_UPDATED',
  SUPPLIER_DELETED = 'SUPPLIER_DELETED',
  
  // Schedule Management
  SCHEDULE_CREATED = 'SCHEDULE_CREATED',
  SCHEDULE_UPDATED = 'SCHEDULE_UPDATED',
  SCHEDULE_DELETED = 'SCHEDULE_DELETED',
  
  // Alert Management
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  
  // Subscription Management
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  
  // Tenant Management
  TENANT_CREATED = 'TENANT_CREATED',
  TENANT_UPDATED = 'TENANT_UPDATED',
  TENANT_SETTINGS_CHANGED = 'TENANT_SETTINGS_CHANGED',
  
  // Reports and Analytics
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_EXPORTED = 'REPORT_EXPORTED',
  ANALYTICS_VIEWED = 'ANALYTICS_VIEWED',
  
  // System Events
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  FEATURE_FLAG_CHANGED = 'FEATURE_FLAG_CHANGED',
}

// Activity severity levels
export enum ActivitySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Activity log entry interface
export interface ActivityLogEntry {
  id?: string;
  tenantId: string;
  userId?: string;
  activityType: ActivityType;
  severity: ActivitySeverity;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  resourceId?: string;
  resourceType?: string;
  timestamp?: Date;
}

// Activity logger class
export class ActivityLogger {
  private static instance: ActivityLogger;
  
  private constructor() {}
  
  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }
  
  // Log activity with full context
  async logActivity(entry: ActivityLogEntry): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          activityType: entry.activityType,
          severity: entry.severity,
          description: entry.description,
          metadata: entry.metadata || {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          resourceId: entry.resourceId,
          resourceType: entry.resourceType,
          timestamp: entry.timestamp || new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }
  
  // Log activity from HTTP request context
  async logActivityFromRequest(
    request: NextRequest,
    activityType: ActivityType,
    description: string,
    options: {
      severity?: ActivitySeverity;
      metadata?: Record<string, any>;
      resourceId?: string;
      resourceType?: string;
      tenantId?: string;
      userId?: string;
    } = {}
  ): Promise<void> {
    try {
      const session = await getServerSession();
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      await this.logActivity({
        tenantId: options.tenantId || session?.user?.tenantId || 'unknown',
        userId: options.userId || session?.user?.id,
        activityType,
        severity: options.severity || ActivitySeverity.MEDIUM,
        description,
        metadata: options.metadata,
        ipAddress,
        userAgent,
        resourceId: options.resourceId,
        resourceType: options.resourceType
      });
    } catch (error) {
      console.error('Failed to log activity from request:', error);
    }
  }
  
  // Get activity logs for a tenant
  async getActivityLogs(
    tenantId: string,
    options: {
      userId?: string;
      activityType?: ActivityType;
      severity?: ActivitySeverity;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const where: any = { tenantId };
    
    if (options.userId) where.userId = options.userId;
    if (options.activityType) where.activityType = options.activityType;
    if (options.severity) where.severity = options.severity;
    if (options.resourceType) where.resourceType = options.resourceType;
    
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }
    
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      }),
      prisma.activityLog.count({ where })
    ]);
    
    return { logs, total };
  }
  
  // Get activity statistics for a tenant
  async getActivityStats(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'day' | 'week' | 'month';
    } = {}
  ) {
    const where: any = { tenantId };
    
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }
    
    // Get activity counts by type
    const activityByType = await prisma.activityLog.groupBy({
      by: ['activityType'],
      where,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    // Get activity counts by severity
    const activityBySeverity = await prisma.activityLog.groupBy({
      by: ['severity'],
      where,
      _count: {
        id: true
      }
    });
    
    // Get most active users
    const mostActiveUsers = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        ...where,
        userId: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });
    
    return {
      activityByType,
      activityBySeverity,
      mostActiveUsers
    };
  }
  
  // Clean up old activity logs
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });
    
    return result.count;
  }
}

// Convenience functions for common logging scenarios
export const activityLogger = ActivityLogger.getInstance();

// Authentication activities
export const logUserLogin = (tenantId: string, userId: string, ipAddress?: string, userAgent?: string) => {
  return activityLogger.logActivity({
    tenantId,
    userId,
    activityType: ActivityType.USER_LOGIN,
    severity: ActivitySeverity.LOW,
    description: 'User logged in',
    ipAddress,
    userAgent
  });
};

export const logUserLogout = (tenantId: string, userId: string, ipAddress?: string, userAgent?: string) => {
  return activityLogger.logActivity({
    tenantId,
    userId,
    activityType: ActivityType.USER_LOGOUT,
    severity: ActivitySeverity.LOW,
    description: 'User logged out',
    ipAddress,
    userAgent
  });
};

// Resource management activities
export const logResourceCreated = (
  tenantId: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  resourceName: string
) => {
  const activityTypeMap: Record<string, ActivityType> = {
    'ingredient': ActivityType.INGREDIENT_CREATED,
    'recipe': ActivityType.RECIPE_CREATED,
    'batch': ActivityType.BATCH_CREATED,
    'product': ActivityType.PRODUCT_CREATED,
    'supplier': ActivityType.SUPPLIER_CREATED,
    'schedule': ActivityType.SCHEDULE_CREATED,
    'user': ActivityType.USER_CREATED
  };
  
  const activityType = activityTypeMap[resourceType] || ActivityType.USER_CREATED;
  
  return activityLogger.logActivity({
    tenantId,
    userId,
    activityType,
    severity: ActivitySeverity.MEDIUM,
    description: `Created ${resourceType}: ${resourceName}`,
    resourceId,
    resourceType,
    metadata: { resourceName }
  });
};

export const logResourceUpdated = (
  tenantId: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  resourceName: string,
  changes?: Record<string, any>
) => {
  const activityTypeMap: Record<string, ActivityType> = {
    'ingredient': ActivityType.INGREDIENT_UPDATED,
    'recipe': ActivityType.RECIPE_UPDATED,
    'batch': ActivityType.BATCH_UPDATED,
    'product': ActivityType.PRODUCT_UPDATED,
    'supplier': ActivityType.SUPPLIER_UPDATED,
    'schedule': ActivityType.SCHEDULE_UPDATED,
    'user': ActivityType.USER_UPDATED
  };
  
  const activityType = activityTypeMap[resourceType] || ActivityType.USER_UPDATED;
  
  return activityLogger.logActivity({
    tenantId,
    userId,
    activityType,
    severity: ActivitySeverity.MEDIUM,
    description: `Updated ${resourceType}: ${resourceName}`,
    resourceId,
    resourceType,
    metadata: { resourceName, changes }
  });
};

export const logResourceDeleted = (
  tenantId: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  resourceName: string
) => {
  const activityTypeMap: Record<string, ActivityType> = {
    'ingredient': ActivityType.INGREDIENT_DELETED,
    'recipe': ActivityType.RECIPE_DELETED,
    'batch': ActivityType.BATCH_DELETED,
    'product': ActivityType.PRODUCT_DELETED,
    'supplier': ActivityType.SUPPLIER_DELETED,
    'schedule': ActivityType.SCHEDULE_DELETED,
    'user': ActivityType.USER_DELETED
  };
  
  const activityType = activityTypeMap[resourceType] || ActivityType.USER_DELETED;
  
  return activityLogger.logActivity({
    tenantId,
    userId,
    activityType,
    severity: ActivitySeverity.HIGH,
    description: `Deleted ${resourceType}: ${resourceName}`,
    resourceId,
    resourceType,
    metadata: { resourceName }
  });
};

// Middleware for automatic activity logging
export function withActivityLogging(activityType: ActivityType, description: string) {
  return function (handler: Function) {
    return async function (req: any, res: any, ...args: any[]) {
      const result = await handler(req, res, ...args);
      
      // Log the activity after successful execution
      if (res.status < 400) {
        await activityLogger.logActivityFromRequest(req, activityType, description, {
          severity: ActivitySeverity.MEDIUM
        });
      }
      
      return result;
    };
  };
}