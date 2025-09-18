import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
const rateLimitConfigs = {
  general: { limit: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  auth: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  sensitive: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 requests per hour
};

// Helper function to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a combination of headers for identification
  const userAgent = req.headers.get('user-agent') || '';
  return `fallback_${userAgent.slice(0, 50)}`;
}

// Clean up expired entries
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export type RateLimitType = keyof typeof rateLimitConfigs;

export async function rateLimit(
  req: NextRequest,
  type: RateLimitType = 'general'
): Promise<{ success: boolean; limit: number; remaining: number; resetTime: Date }> {
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup on each request
    cleanupExpiredEntries();
  }
  
  const config = rateLimitConfigs[type];
  const clientIP = getClientIP(req);
  const key = `${type}_${clientIP}`;
  const now = Date.now();
  const windowStart = now;
  const windowEnd = now + config.windowMs;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: windowEnd
    });
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime: new Date(windowEnd)
    };
  }
  
  if (existing.count >= config.limit) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: new Date(existing.resetTime)
    };
  }
  
  // Increment counter
  existing.count++;
  rateLimitStore.set(key, existing);
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    resetTime: new Date(existing.resetTime)
  };
}

// Middleware wrapper for API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  type: RateLimitType = 'general'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = await rateLimit(req, type);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          resetTime: rateLimitResult.resetTime.toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString()
          }
        }
      );
    }
    
    const response = await handler(req);
    
    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());
    
    return response;
  };
}

// Simple rate limiting check for middleware
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType = 'general'
): Promise<NextResponse | null> {
  const rateLimitResult = await rateLimit(req, type);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        resetTime: rateLimitResult.resetTime.toISOString()
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString()
        }
      }
    );
  }
  
  return null; // No rate limit exceeded
}