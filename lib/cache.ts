// Simple in-memory cache with TTL support
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  // Dashboard data
  dashboardStats: (tenantId: string) => `dashboard:stats:${tenantId}`,
  recentBatches: (tenantId: string) => `dashboard:batches:${tenantId}`,
  lowStockIngredients: (tenantId: string) => `dashboard:lowstock:${tenantId}`,
  
  // Subscription data
  subscription: (tenantId: string) => `subscription:${tenantId}`,
  subscriptionWarning: (tenantId: string) => `subscription:warning:${tenantId}`,
  
  // Tenant data
  tenant: (subdomain: string) => `tenant:${subdomain}`,
  tenantById: (tenantId: string) => `tenant:id:${tenantId}`,
  
  // User data (short TTL for security)
  user: (tenantId: string, email: string) => `user:${tenantId}:${email}`,
  
  // Subscription plans (longer TTL as they change infrequently)
  subscriptionPlans: () => `subscription:plans`,
  
  // Analytics data
  analytics: (tenantId: string, period: string) => `analytics:${tenantId}:${period}`,
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};

// Helper functions for common caching patterns
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  cache.set(key, data, ttl);
  
  return data;
}

// Invalidate related cache entries
export function invalidateCache(patterns: string[]): void {
  const stats = cache.getStats();
  
  for (const pattern of patterns) {
    // Simple pattern matching - if key contains pattern, delete it
    for (const key of stats.keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }
}

// Cache warming functions
export async function warmDashboardCache(tenantId: string): Promise<void> {
  // Pre-warm dashboard cache in background
  try {
    const { prisma } = await import('./prisma');
    
    // Warm up basic stats
    const [ingredientCount, batchCount, productCount] = await Promise.all([
      prisma.ingredient.count({
        where: { tenantId, isActive: true },
      }),
      prisma.batch.count({
        where: { tenantId },
      }),
      prisma.product.count({
        where: { tenantId },
      }),
    ]);

    cache.set(
      CacheKeys.dashboardStats(tenantId),
      {
        totalIngredients: ingredientCount,
        activeBatches: batchCount,
        totalProducts: productCount,
      },
      CacheTTL.MEDIUM
    );
  } catch (error) {
    console.error('Failed to warm dashboard cache:', error);
  }
}

// Export cache instance and utilities
export default cache;
