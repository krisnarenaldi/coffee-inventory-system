import { z } from 'zod';

// Password complexity requirements
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength?: number;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
}

// Default password requirements
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  preventCommonPasswords: true,
  preventUserInfo: true
};

// Common weak passwords to prevent
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty',
  'abc123', 'password1', 'admin', 'letmein', 'welcome',
  'monkey', '1234567890', 'dragon', 'master', 'shadow',
  'superman', 'michael', 'football', 'baseball', 'liverpool',
  'jordan', 'harley', 'robert', 'matthew', 'daniel',
  'andrew', 'joshua', 'anthony', 'william', 'david'
];

// Password validation result
export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
}

// User information interface for preventing personal info in passwords
export interface UserInfo {
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  companyName?: string;
}

// Calculate password entropy
function calculateEntropy(password: string): number {
  const charSets = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password)
  };
  
  let charSetSize = 0;
  if (charSets.lowercase) charSetSize += 26;
  if (charSets.uppercase) charSetSize += 26;
  if (charSets.numbers) charSetSize += 10;
  if (charSets.special) charSetSize += 32; // Approximate
  
  return password.length * Math.log2(charSetSize);
}

// Check for sequential characters
function hasSequentialChars(password: string): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
    '1234567890'
  ];
  
  const lowerPassword = password.toLowerCase();
  
  for (const sequence of sequences) {
    for (let i = 0; i <= sequence.length - 3; i++) {
      const subseq = sequence.substring(i, i + 3);
      if (lowerPassword.includes(subseq) || lowerPassword.includes(subseq.split('').reverse().join(''))) {
        return true;
      }
    }
  }
  
  return false;
}

// Check for repeated patterns
function hasRepeatedPatterns(password: string): boolean {
  // Check for repeated characters (3 or more)
  if (/(..).*\1/.test(password)) return true;
  
  // Check for repeated sequences
  for (let i = 1; i <= password.length / 2; i++) {
    const pattern = password.substring(0, i);
    const repeated = pattern.repeat(Math.floor(password.length / i));
    if (password.startsWith(repeated) && repeated.length >= 4) {
      return true;
    }
  }
  
  return false;
}

// Check if password contains user information
function containsUserInfo(password: string, userInfo?: UserInfo): string[] {
  if (!userInfo) return [];
  
  const violations: string[] = [];
  const lowerPassword = password.toLowerCase();
  
  const checkField = (field: string | undefined, fieldName: string) => {
    if (field && field.length >= 3) {
      const lowerField = field.toLowerCase();
      if (lowerPassword.includes(lowerField)) {
        violations.push(`Password contains ${fieldName}`);
      }
      
      // Check email username part
      if (fieldName === 'email' && field.includes('@')) {
        const username = field.split('@')[0].toLowerCase();
        if (username.length >= 3 && lowerPassword.includes(username)) {
          violations.push('Password contains email username');
        }
      }
    }
  };
  
  checkField(userInfo.email, 'email');
  checkField(userInfo.firstName, 'first name');
  checkField(userInfo.lastName, 'last name');
  checkField(userInfo.username, 'username');
  checkField(userInfo.companyName, 'company name');
  
  return violations;
}

// Main password validation function
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
  userInfo?: UserInfo
): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  
  // Length validation
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  } else {
    score += Math.min(25, (password.length / requirements.minLength) * 25);
  }
  
  if (requirements.maxLength && password.length > requirements.maxLength) {
    errors.push(`Password must not exceed ${requirements.maxLength} characters`);
  }
  
  // Character type validation
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
    suggestions.push('Add uppercase letters (A-Z)');
  } else if (requirements.requireUppercase) {
    score += 15;
  }
  
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
    suggestions.push('Add lowercase letters (a-z)');
  } else if (requirements.requireLowercase) {
    score += 15;
  }
  
  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
    suggestions.push('Add numbers (0-9)');
  } else if (requirements.requireNumbers) {
    score += 15;
  }
  
  if (requirements.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
    suggestions.push('Add special characters (!@#$%^&*)');
  } else if (requirements.requireSpecialChars) {
    score += 15;
  }
  
  // Common password check
  if (requirements.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.includes(lowerPassword)) {
      errors.push('Password is too common and easily guessable');
      suggestions.push('Use a unique password that is not commonly used');
      score = Math.min(score, 20);
    }
  }
  
  // User information check
  if (requirements.preventUserInfo && userInfo) {
    const userInfoViolations = containsUserInfo(password, userInfo);
    errors.push(...userInfoViolations);
    if (userInfoViolations.length > 0) {
      suggestions.push('Avoid using personal information in your password');
      score = Math.min(score, 30);
    }
  }
  
  // Advanced pattern checks
  if (hasSequentialChars(password)) {
    errors.push('Password contains sequential characters');
    suggestions.push('Avoid sequential characters like "abc" or "123"');
    score -= 10;
  }
  
  if (hasRepeatedPatterns(password)) {
    errors.push('Password contains repeated patterns');
    suggestions.push('Avoid repeating characters or patterns');
    score -= 10;
  }
  
  // Entropy bonus
  const entropy = calculateEntropy(password);
  if (entropy > 50) {
    score += Math.min(15, (entropy - 50) / 5);
  }
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));
  
  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score < 20) strength = 'very-weak';
  else if (score < 40) strength = 'weak';
  else if (score < 60) strength = 'fair';
  else if (score < 80) strength = 'good';
  else strength = 'strong';
  
  // Add general suggestions if score is low
  if (score < 60 && suggestions.length === 0) {
    suggestions.push('Consider making your password longer and more complex');
  }
  
  return {
    isValid: errors.length === 0,
    score,
    errors,
    suggestions,
    strength
  };
}

// Zod schema for password validation
export function createPasswordSchema(
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
  userInfo?: UserInfo
) {
  return z.string()
    .min(requirements.minLength, `Password must be at least ${requirements.minLength} characters long`)
    .max(requirements.maxLength || 128, `Password must not exceed ${requirements.maxLength || 128} characters`)
    .refine((password) => {
      const result = validatePassword(password, requirements, userInfo);
      return result.isValid;
    }, (password) => {
      const result = validatePassword(password, requirements, userInfo);
      return {
        message: result.errors[0] || 'Password does not meet complexity requirements'
      };
    });
}

// Password strength indicator component data
export function getPasswordStrengthIndicator(result: PasswordValidationResult) {
  const colors = {
    'very-weak': '#ff4444',
    'weak': '#ff8800',
    'fair': '#ffbb00',
    'good': '#88cc00',
    'strong': '#00cc44'
  };
  
  const labels = {
    'very-weak': 'Very Weak',
    'weak': 'Weak',
    'fair': 'Fair',
    'good': 'Good',
    'strong': 'Strong'
  };
  
  return {
    score: result.score,
    strength: result.strength,
    color: colors[result.strength],
    label: labels[result.strength],
    percentage: result.score
  };
}

// Generate a secure password suggestion
export function generateSecurePassword(
  length: number = 16,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let charset = '';
  let password = '';
  
  // Ensure required character types are included
  if (requirements.requireLowercase) {
    charset += lowercase;
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }
  
  if (requirements.requireUppercase) {
    charset += uppercase;
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
  }
  
  if (requirements.requireNumbers) {
    charset += numbers;
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  if (requirements.requireSpecialChars) {
    charset += special;
    password += special[Math.floor(Math.random() * special.length)];
  }
  
  // Fill remaining length
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}