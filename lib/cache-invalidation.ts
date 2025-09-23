import { invalidateCache, CacheKeys } from './cache';

/**
 * Cache invalidation utilities for maintaining data consistency
 */

// Invalidate dashboard-related cache when inventory changes
export function invalidateDashboardCache(tenantId: string): void {
  invalidateCache([
    `dashboard:${tenantId}`,
    `lowstock:${tenantId}`,
    `batches:${tenantId}`,
  ]);
}

// Invalidate subscription cache when subscription changes
export function invalidateSubscriptionCache(tenantId: string): void {
  invalidateCache([
    `subscription:${tenantId}`,
    `subscription:warning:${tenantId}`,
  ]);
}

// Invalidate tenant cache when tenant data changes
export function invalidateTenantCache(tenantId: string, subdomain?: string): void {
  const patterns = [`tenant:id:${tenantId}`];
  if (subdomain) {
    patterns.push(`tenant:${subdomain}`);
  }
  invalidateCache(patterns);
}

// Invalidate user cache when user data changes
export function invalidateUserCache(tenantId: string, email?: string): void {
  const patterns = [`user:${tenantId}`];
  if (email) {
    patterns.push(`user:${tenantId}:${email}`);
  }
  invalidateCache(patterns);
}

// Invalidate subscription plans cache when plans change
export function invalidateSubscriptionPlansCache(): void {
  invalidateCache(['subscription:plans']);
}

// Invalidate analytics cache when data changes
export function invalidateAnalyticsCache(tenantId: string): void {
  invalidateCache([`analytics:${tenantId}`]);
}

// Comprehensive cache invalidation for major data changes
export function invalidateAllTenantCache(tenantId: string): void {
  invalidateCache([
    `dashboard:${tenantId}`,
    `subscription:${tenantId}`,
    `analytics:${tenantId}`,
    `user:${tenantId}`,
    `tenant:id:${tenantId}`,
  ]);
}

// Cache invalidation hooks for common operations
export const CacheInvalidation = {
  // Inventory operations
  onIngredientChange: (tenantId: string) => {
    invalidateDashboardCache(tenantId);
    invalidateAnalyticsCache(tenantId);
  },

  onBatchChange: (tenantId: string) => {
    invalidateDashboardCache(tenantId);
    invalidateAnalyticsCache(tenantId);
  },

  onProductChange: (tenantId: string) => {
    invalidateDashboardCache(tenantId);
    invalidateAnalyticsCache(tenantId);
  },

  // Subscription operations
  onSubscriptionChange: (tenantId: string) => {
    invalidateSubscriptionCache(tenantId);
  },

  onSubscriptionPlanChange: () => {
    invalidateSubscriptionPlansCache();
  },

  // User operations
  onUserChange: (tenantId: string, email?: string) => {
    invalidateUserCache(tenantId, email);
  },

  // Tenant operations
  onTenantChange: (tenantId: string, subdomain?: string) => {
    invalidateTenantCache(tenantId, subdomain);
  },

  // Complete cache refresh
  onMajorChange: (tenantId: string) => {
    invalidateAllTenantCache(tenantId);
  },
};

export default CacheInvalidation;
