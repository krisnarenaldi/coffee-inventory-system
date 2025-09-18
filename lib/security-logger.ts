import pino from 'pino';
import { NextRequest, NextResponse } from 'next/server';

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  base: {
    env: process.env.NODE_ENV,
    service: 'brewery-inventory-api'
  }
});

// Security event types
export enum SecurityEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  AUTH_LOGOUT = 'auth_logout',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_VIOLATION = 'csrf_violation',
  SUSPICIOUS_REQUEST = 'suspicious_request',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  PERMISSION_DENIED = 'permission_denied',
  API_ERROR = 'api_error',
  SECURITY_SCAN_ATTEMPT = 'security_scan_attempt'
}

// Security log entry interface
interface SecurityLogEntry {
  eventType: SecurityEventType;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Helper function to extract client information
function extractClientInfo(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  let ipAddress = 'unknown';
  if (forwarded) {
    ipAddress = forwarded.split(',')[0].trim();
  } else if (realIP) {
    ipAddress = realIP;
  }
  
  return { ipAddress, userAgent };
}

// Helper function to extract session info
function extractSessionInfo(req: NextRequest) {
  const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
                      req.cookies.get('__Secure-next-auth.session-token')?.value;
  
  return {
    sessionId: sessionToken ? sessionToken.substring(0, 16) + '...' : undefined
  };
}

// Main security logging function
export function logSecurityEvent(
  eventType: SecurityEventType,
  req: NextRequest,
  options: {
    userId?: string;
    statusCode?: number;
    message: string;
    metadata?: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }
) {
  const { ipAddress, userAgent } = extractClientInfo(req);
  const { sessionId } = extractSessionInfo(req);
  
  const logEntry: SecurityLogEntry = {
    eventType,
    userId: options.userId,
    sessionId,
    ipAddress,
    userAgent,
    endpoint: req.nextUrl.pathname,
    method: req.method,
    statusCode: options.statusCode,
    message: options.message,
    metadata: options.metadata,
    timestamp: new Date().toISOString(),
    severity: options.severity || 'medium'
  };
  
  // Log based on severity
  switch (options.severity) {
    case 'critical':
      logger.fatal(logEntry, options.message);
      break;
    case 'high':
      logger.error(logEntry, options.message);
      break;
    case 'medium':
      logger.warn(logEntry, options.message);
      break;
    case 'low':
    default:
      logger.info(logEntry, options.message);
      break;
  }
}

// Specific logging functions for common security events
export const securityLogger = {
  authSuccess: (req: NextRequest, userId: string) => {
    logSecurityEvent(SecurityEventType.AUTH_SUCCESS, req, {
      userId,
      message: `User ${userId} successfully authenticated`,
      severity: 'low'
    });
  },
  
  authFailure: (req: NextRequest, reason: string, metadata?: Record<string, any>) => {
    logSecurityEvent(SecurityEventType.AUTH_FAILURE, req, {
      message: `Authentication failed: ${reason}`,
      metadata,
      severity: 'medium'
    });
  },
  
  rateLimitExceeded: (req: NextRequest, limitType: string) => {
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, req, {
      message: `Rate limit exceeded for ${limitType}`,
      metadata: { limitType },
      severity: 'medium'
    });
  },
  
  csrfViolation: (req: NextRequest, userId?: string) => {
    logSecurityEvent(SecurityEventType.CSRF_VIOLATION, req, {
      userId,
      message: 'CSRF token validation failed',
      severity: 'high'
    });
  },
  
  suspiciousRequest: (req: NextRequest, reason: string, metadata?: Record<string, any>) => {
    logSecurityEvent(SecurityEventType.SUSPICIOUS_REQUEST, req, {
      message: `Suspicious request detected: ${reason}`,
      metadata,
      severity: 'high'
    });
  },
  
  dataAccess: (req: NextRequest, userId: string, resource: string) => {
    logSecurityEvent(SecurityEventType.DATA_ACCESS, req, {
      userId,
      message: `User accessed ${resource}`,
      metadata: { resource },
      severity: 'low'
    });
  },
  
  dataModification: (req: NextRequest, userId: string, resource: string, action: string) => {
    logSecurityEvent(SecurityEventType.DATA_MODIFICATION, req, {
      userId,
      message: `User ${action} ${resource}`,
      metadata: { resource, action },
      severity: 'medium'
    });
  },
  
  permissionDenied: (req: NextRequest, userId: string, resource: string) => {
    logSecurityEvent(SecurityEventType.PERMISSION_DENIED, req, {
      userId,
      message: `Access denied to ${resource}`,
      metadata: { resource },
      severity: 'medium'
    });
  },
  
  apiError: (req: NextRequest, error: Error, statusCode: number) => {
    logSecurityEvent(SecurityEventType.API_ERROR, req, {
      statusCode,
      message: `API error: ${error.message}`,
      metadata: { 
        errorName: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      severity: statusCode >= 500 ? 'high' : 'medium'
    });
  }
};

// Middleware wrapper for automatic request logging
export function withSecurityLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;
    let error: Error | null = null;
    
    try {
      response = await handler(req);
    } catch (err) {
      error = err as Error;
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    
    const duration = Date.now() - startTime;
    const { ipAddress, userAgent } = extractClientInfo(req);
    
    // Log the request
    const logData = {
      method: req.method,
      endpoint: req.nextUrl.pathname,
      statusCode: response.status,
      duration,
      ipAddress,
      userAgent: userAgent.substring(0, 200), // Truncate long user agents
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      securityLogger.apiError(req, error, response.status);
    } else if (response.status >= 400) {
      logger.warn(logData, `API request failed with status ${response.status}`);
    } else {
      logger.info(logData, `API request completed successfully`);
    }
    
    // Add security headers to response
    response.headers.set('X-Request-ID', crypto.randomUUID());
    
    return response;
  };
}

// Function to detect suspicious patterns
export function detectSuspiciousActivity(req: NextRequest): string[] {
  const suspiciousPatterns: string[] = [];
  const userAgent = req.headers.get('user-agent') || '';
  const path = req.nextUrl.pathname;
  
  // Check for common attack patterns
  const attackPatterns = [
    /\.\.\//,  // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /exec\(/i, // Code injection
    /eval\(/i, // Code injection
  ];
  
  for (const pattern of attackPatterns) {
    if (pattern.test(path) || pattern.test(userAgent)) {
      suspiciousPatterns.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  }
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i
  ];
  
  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      suspiciousPatterns.push(`Suspicious user agent: ${userAgent}`);
    }
  }
  
  return suspiciousPatterns;
}

export { logger };