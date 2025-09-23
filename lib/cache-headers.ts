import { NextResponse } from 'next/server';

/**
 * Cache header utilities for optimizing browser caching
 */

export interface CacheConfig {
  maxAge?: number; // Cache duration in seconds
  staleWhileRevalidate?: number; // SWR duration in seconds
  mustRevalidate?: boolean; // Force revalidation
  noCache?: boolean; // Disable caching
  private?: boolean; // Private cache only
}

export function setCacheHeaders(response: NextResponse, config: CacheConfig): NextResponse {
  if (config.noCache) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  const cacheDirectives: string[] = [];

  if (config.private) {
    cacheDirectives.push('private');
  } else {
    cacheDirectives.push('public');
  }

  if (config.maxAge !== undefined) {
    cacheDirectives.push(`max-age=${config.maxAge}`);
  }

  if (config.staleWhileRevalidate !== undefined) {
    cacheDirectives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  if (config.mustRevalidate) {
    cacheDirectives.push('must-revalidate');
  }

  response.headers.set('Cache-Control', cacheDirectives.join(', '));
  return response;
}

// Predefined cache configurations
export const CacheConfigs = {
  // No caching for sensitive data
  noCache: {
    noCache: true,
  },

  // Short cache for frequently changing data (1 minute)
  shortCache: {
    maxAge: 60,
    staleWhileRevalidate: 30,
    private: true,
  },

  // Medium cache for moderately changing data (5 minutes)
  mediumCache: {
    maxAge: 300,
    staleWhileRevalidate: 60,
    private: true,
  },

  // Long cache for rarely changing data (15 minutes)
  longCache: {
    maxAge: 900,
    staleWhileRevalidate: 300,
  },

  // Very long cache for static data (1 hour)
  veryLongCache: {
    maxAge: 3600,
    staleWhileRevalidate: 900,
  },

  // Dashboard data cache (2 minutes)
  dashboardCache: {
    maxAge: 120,
    staleWhileRevalidate: 60,
    private: true,
  },

  // Subscription data cache (30 seconds)
  subscriptionCache: {
    maxAge: 30,
    staleWhileRevalidate: 15,
    private: true,
  },

  // Public pricing data cache (15 minutes)
  pricingCache: {
    maxAge: 900,
    staleWhileRevalidate: 300,
  },
};

// Helper function to create cached API responses
export function createCachedResponse(data: any, cacheConfig: CacheConfig): NextResponse {
  const response = NextResponse.json(data);
  return setCacheHeaders(response, cacheConfig);
}

export default {
  setCacheHeaders,
  CacheConfigs,
  createCachedResponse,
};
