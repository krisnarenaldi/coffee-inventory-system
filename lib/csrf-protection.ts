import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// CSRF token store (in production, use Redis or database)
const csrfTokenStore = new Map<string, { token: string; expires: number; sessionId: string }>();

// Clean up expired tokens
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [key, entry] of csrfTokenStore.entries()) {
    if (now > entry.expires) {
      csrfTokenStore.delete(key);
    }
  }
}

// Generate a secure CSRF token
export function generateCSRFToken(sessionId: string): string {
  // Clean up expired tokens periodically
  if (Math.random() < 0.01) {
    cleanupExpiredTokens();
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenId = crypto.randomUUID();
  const expires = Date.now() + (30 * 60 * 1000); // 30 minutes

  csrfTokenStore.set(tokenId, {
    token,
    expires,
    sessionId
  });

  // Return a combination of tokenId and token for verification
  return `${tokenId}:${token}`;
}

// Validate CSRF token
export function validateCSRFToken(tokenString: string, sessionId: string): boolean {
  if (!tokenString || !sessionId) {
    return false;
  }

  const [tokenId, token] = tokenString.split(':');
  if (!tokenId || !token) {
    return false;
  }

  const storedEntry = csrfTokenStore.get(tokenId);
  if (!storedEntry) {
    return false;
  }

  // Check if token has expired
  if (Date.now() > storedEntry.expires) {
    csrfTokenStore.delete(tokenId);
    return false;
  }

  // Verify token and session match
  if (storedEntry.token !== token || storedEntry.sessionId !== sessionId) {
    return false;
  }

  // Token is valid, remove it (one-time use)
  csrfTokenStore.delete(tokenId);
  return true;
}

// Get session ID from request (you may need to adjust this based on your auth setup)
function getSessionId(req: NextRequest): string | null {
  // Try to get session from NextAuth cookie
  const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
                      req.cookies.get('__Secure-next-auth.session-token')?.value;
  
  if (sessionToken) {
    return sessionToken;
  }

  // Fallback to a combination of user agent and IP for anonymous sessions
  const userAgent = req.headers.get('user-agent') || '';
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  
  return crypto.createHash('sha256')
    .update(`${userAgent}:${ip}`)
    .digest('hex')
    .substring(0, 32);
}

// Middleware to add CSRF token to responses
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const sessionId = getSessionId(req);
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session required for CSRF protection' },
        { status: 401 }
      );
    }

    // For GET requests, generate and include CSRF token
    if (req.method === 'GET') {
      const response = await handler(req);
      const csrfToken = generateCSRFToken(sessionId);
      
      response.headers.set('X-CSRF-Token', csrfToken);
      return response;
    }

    // For state-changing requests (POST, PUT, DELETE), validate CSRF token
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken = req.headers.get('X-CSRF-Token') || 
                       req.headers.get('x-csrf-token');
      
      if (!csrfToken || !validateCSRFToken(csrfToken, sessionId)) {
        return NextResponse.json(
          { 
            error: 'CSRF token validation failed',
            message: 'Invalid or missing CSRF token'
          },
          { status: 403 }
        );
      }
    }

    return handler(req);
  };
}

// Helper function to get CSRF token for client-side use
export async function getCSRFToken(req: NextRequest): Promise<string | null> {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return null;
  }
  
  return generateCSRFToken(sessionId);
}

// API route to get CSRF token
export async function handleCSRFTokenRequest(req: NextRequest): Promise<NextResponse> {
  if (req.method !== 'GET') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  const csrfToken = await getCSRFToken(req);
  
  if (!csrfToken) {
    return NextResponse.json(
      { error: 'Unable to generate CSRF token' },
      { status: 400 }
    );
  }

  return NextResponse.json({ csrfToken });
}