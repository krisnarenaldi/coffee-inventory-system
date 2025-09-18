import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Configuration for different sanitization levels
const sanitizationConfigs = {
  // Strict: Only allow basic text, no HTML
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  
  // Basic: Allow basic formatting tags
  basic: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  
  // Rich: Allow more formatting but still safe
  rich: {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'
    ],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
  },
};

export type SanitizationLevel = keyof typeof sanitizationConfigs;

// Sanitize HTML content
export function sanitizeHTML(
  input: string,
  level: SanitizationLevel = 'strict'
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const config = sanitizationConfigs[level];
  return DOMPurify.sanitize(input, config);
}

// Sanitize and validate email
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  
  if (!validator.isEmail(trimmed)) {
    return null;
  }

  return validator.normalizeEmail(trimmed) || null;
}

// Sanitize and validate URL
export function sanitizeURL(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
  })) {
    return null;
  }

  return trimmed;
}

// Sanitize phone number
export function sanitizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (!validator.isMobilePhone(digitsOnly, 'any', { strictMode: false })) {
    return null;
  }

  return digitsOnly;
}

// Sanitize general text input
export function sanitizeText(
  input: string,
  options: {
    maxLength?: number;
    allowNewlines?: boolean;
    allowSpecialChars?: boolean;
  } = {}
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove or escape HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Handle newlines
  if (!options.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }

  // Handle special characters
  if (!options.allowSpecialChars) {
    sanitized = sanitized.replace(/[<>"'&]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[match] || match;
    });
  }

  // Truncate if needed
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

// Sanitize numeric input
export function sanitizeNumber(
  input: string | number,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  // Check if integer is required
  if (options.integer && !Number.isInteger(num)) {
    return null;
  }

  // Check bounds
  if (options.min !== undefined && num < options.min) {
    return null;
  }

  if (options.max !== undefined && num > options.max) {
    return null;
  }

  return num;
}

// Sanitize file name
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'untitled';
  }

  // Remove path separators and dangerous characters
  let sanitized = fileName.replace(/[\/\\:*?"<>|]/g, '_');
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 255 - (ext ? ext.length + 1 : 0));
    sanitized = ext ? `${name}.${ext}` : name;
  }

  return sanitized || 'untitled';
}

// Comprehensive input sanitization for API requests
export function sanitizeApiInput(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeText(data, { maxLength: 10000 });
  }

  if (typeof data === 'number') {
    return sanitizeNumber(data);
  }

  if (typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeApiInput(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = sanitizeText(key, { maxLength: 100, allowSpecialChars: false });
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeApiInput(value);
      }
    }
    return sanitized;
  }

  return data;
}

// Middleware wrapper for API input sanitization
export function withInputSanitization(
  handler: (req: any) => Promise<any>
) {
  return async (req: any): Promise<any> => {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeApiInput(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeApiInput(req.query);
    }

    return handler(req);
  };
}

// Validation schemas for common inputs
export const validationSchemas = {
  email: (value: string) => sanitizeEmail(value) !== null,
  url: (value: string) => sanitizeURL(value) !== null,
  phone: (value: string) => sanitizePhoneNumber(value) !== null,
  strongPassword: (value: string) => {
    return validator.isStrongPassword(value, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    });
  },
};