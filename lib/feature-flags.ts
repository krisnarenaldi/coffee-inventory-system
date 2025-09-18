import { prisma } from './prisma';

// Feature flag types
export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  conditions?: FeatureFlagCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagCondition {
  id: string;
  flagId: string;
  type: 'user_id' | 'tenant_id' | 'user_role' | 'subscription_plan' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'greater_than' | 'less_than';
  value: string;
  isEnabled: boolean;
}

export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  userRole?: string;
  subscriptionPlan?: string;
  customAttributes?: Record<string, any>;
}

// Feature flag evaluation result
export interface FeatureFlagResult {
  isEnabled: boolean;
  variant?: string;
  reason: string;
  flagKey: string;
}

// Built-in feature flags (can be overridden by database)
const DEFAULT_FLAGS: Record<string, boolean> = {
  // Core features
  'multi_tenant_support': true,
  'subscription_billing': true,
  'qr_code_scanning': true,
  
  // New features (gradual rollout)
  'advanced_analytics': false,
  'ai_recommendations': false,
  'mobile_app_support': false,
  'api_v2': false,
  
  // Experimental features
  'new_dashboard_ui': false,
  'batch_operations': false,
  'inventory_forecasting': false,
  'integration_marketplace': false,
  
  // Admin features
  'platform_admin_panel': true,
  'system_health_monitoring': true,
  'tenant_analytics': true,
  
  // Performance features
  'redis_caching': false,
  'cdn_optimization': false,
  'database_read_replicas': false,
};

// Hash function for consistent user bucketing
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Check if user is in rollout percentage
function isUserInRollout(userId: string, percentage: number): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;
  
  const hash = hashString(userId);
  const bucket = hash % 100;
  return bucket < percentage;
}

// Evaluate feature flag conditions
function evaluateConditions(
  conditions: FeatureFlagCondition[],
  context: FeatureFlagContext
): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  return conditions.every(condition => {
    if (!condition.isEnabled) return true;
    
    let contextValue: any;
    
    switch (condition.type) {
      case 'user_id':
        contextValue = context.userId;
        break;
      case 'tenant_id':
        contextValue = context.tenantId;
        break;
      case 'user_role':
        contextValue = context.userRole;
        break;
      case 'subscription_plan':
        contextValue = context.subscriptionPlan;
        break;
      case 'custom':
        contextValue = context.customAttributes?.[condition.value];
        break;
      default:
        return false;
    }
    
    if (contextValue === undefined || contextValue === null) return false;
    
    const conditionValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === conditionValue;
      case 'not_equals':
        return contextValue !== conditionValue;
      case 'in':
        const inValues = conditionValue.split(',').map(v => v.trim());
        return inValues.includes(contextValue);
      case 'not_in':
        const notInValues = conditionValue.split(',').map(v => v.trim());
        return !notInValues.includes(contextValue);
      case 'contains':
        return String(contextValue).includes(conditionValue);
      case 'greater_than':
        return Number(contextValue) > Number(conditionValue);
      case 'less_than':
        return Number(contextValue) < Number(conditionValue);
      default:
        return false;
    }
  });
}

// Main feature flag evaluation function
export async function isFeatureEnabled(
  flagKey: string,
  context: FeatureFlagContext = {}
): Promise<FeatureFlagResult> {
  try {
    // Try to get flag from database first
    const flag = await prisma.featureFlag.findUnique({
      where: { key: flagKey },
      include: { conditions: true }
    });
    
    if (flag) {
      // Check if flag is globally disabled
      if (!flag.isEnabled) {
        return {
          isEnabled: false,
          reason: 'Flag is globally disabled',
          flagKey
        };
      }
      
      // Check conditions
      if (!evaluateConditions(flag.conditions, context)) {
        return {
          isEnabled: false,
          reason: 'Conditions not met',
          flagKey
        };
      }
      
      // Check rollout percentage
      if (context.userId && !isUserInRollout(context.userId, flag.rolloutPercentage)) {
        return {
          isEnabled: false,
          reason: 'User not in rollout percentage',
          flagKey
        };
      }
      
      return {
        isEnabled: true,
        reason: 'All conditions met',
        flagKey
      };
    }
    
    // Fall back to default flags
    const defaultValue = DEFAULT_FLAGS[flagKey] ?? false;
    
    return {
      isEnabled: defaultValue,
      reason: defaultValue ? 'Default enabled' : 'Default disabled',
      flagKey
    };
    
  } catch (error) {
    console.error(`Error evaluating feature flag ${flagKey}:`, error);
    
    // Fall back to default in case of error
    const defaultValue = DEFAULT_FLAGS[flagKey] ?? false;
    
    return {
      isEnabled: defaultValue,
      reason: 'Error fallback to default',
      flagKey
    };
  }
}

// Batch evaluate multiple feature flags
export async function evaluateFeatureFlags(
  flagKeys: string[],
  context: FeatureFlagContext = {}
): Promise<Record<string, FeatureFlagResult>> {
  const results: Record<string, FeatureFlagResult> = {};
  
  await Promise.all(
    flagKeys.map(async (flagKey) => {
      results[flagKey] = await isFeatureEnabled(flagKey, context);
    })
  );
  
  return results;
}

// Get all available feature flags
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const dbFlags = await prisma.featureFlag.findMany({
      include: { conditions: true },
      orderBy: { name: 'asc' }
    });
    
    return dbFlags;
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }
}

// Create or update a feature flag
export async function upsertFeatureFlag(
  flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FeatureFlag> {
  return await prisma.featureFlag.upsert({
    where: { key: flagData.key },
    update: {
      name: flagData.name,
      description: flagData.description,
      isEnabled: flagData.isEnabled,
      rolloutPercentage: flagData.rolloutPercentage
    },
    create: flagData,
    include: { conditions: true }
  });
}

// Delete a feature flag
export async function deleteFeatureFlag(flagKey: string): Promise<void> {
  await prisma.featureFlag.delete({
    where: { key: flagKey }
  });
}

// Feature flag middleware for API routes
export function withFeatureFlag(flagKey: string) {
  return function (handler: Function) {
    return async function (req: any, res: any, ...args: any[]) {
      const context: FeatureFlagContext = {
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        userRole: req.user?.role,
        subscriptionPlan: req.user?.subscriptionPlan
      };
      
      const result = await isFeatureEnabled(flagKey, context);
      
      if (!result.isEnabled) {
        return res.status(404).json({
          error: 'Feature not available',
          reason: result.reason
        });
      }
      
      return handler(req, res, ...args);
    };
  };
}

// React hook for feature flags (to be used in components)
export function useFeatureFlag(flagKey: string, context?: FeatureFlagContext) {
  // This would be implemented as a React hook in a separate file
  // For now, this is just the interface
  return {
    isEnabled: false,
    isLoading: true,
    error: null
  };
}

// Utility functions for common feature checks
export const FeatureFlags = {
  // Core features
  isMultiTenantEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('multi_tenant_support', context),
  
  isSubscriptionBillingEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('subscription_billing', context),
  
  isQrScanningEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('qr_code_scanning', context),
  
  // New features
  isAdvancedAnalyticsEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('advanced_analytics', context),
  
  isAiRecommendationsEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('ai_recommendations', context),
  
  isMobileAppSupportEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('mobile_app_support', context),
  
  // Admin features
  isPlatformAdminEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('platform_admin_panel', context),
  
  isSystemHealthMonitoringEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('system_health_monitoring', context),
  
  // Performance features
  isRedisCachingEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('redis_caching', context),
  
  isCdnOptimizationEnabled: (context?: FeatureFlagContext) => 
    isFeatureEnabled('cdn_optimization', context)
};