import bcrypt from 'bcryptjs';

/**
 * Password hashing utilities with performance optimization options
 */

// Get bcrypt rounds from environment or use default
const getBcryptRounds = (): number => {
  const envRounds = process.env.BCRYPT_ROUNDS;
  if (envRounds) {
    const rounds = parseInt(envRounds, 10);
    if (rounds >= 8 && rounds <= 15) {
      return rounds;
    }
  }
  
  // Default: 12 rounds for production (very secure), 10 for development (faster)
  return process.env.NODE_ENV === 'production' ? 12 : 10;
};

const BCRYPT_ROUNDS = getBcryptRounds();

/**
 * Hash a password with configurable rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get current bcrypt configuration info
 */
export function getBcryptInfo() {
  return {
    rounds: BCRYPT_ROUNDS,
    environment: process.env.NODE_ENV,
    estimatedHashTime: BCRYPT_ROUNDS === 10 ? '~100-150ms' : '~200-300ms',
    securityLevel: BCRYPT_ROUNDS >= 12 ? 'Very High' : BCRYPT_ROUNDS >= 10 ? 'High' : 'Medium',
  };
}

/**
 * Benchmark bcrypt performance
 */
export async function benchmarkBcrypt(rounds: number = BCRYPT_ROUNDS): Promise<{
  rounds: number;
  hashTime: number;
  compareTime: number;
}> {
  const testPassword = 'test-password-123';
  
  // Benchmark hashing
  const hashStart = Date.now();
  const hash = await bcrypt.hash(testPassword, rounds);
  const hashTime = Date.now() - hashStart;
  
  // Benchmark comparison
  const compareStart = Date.now();
  await bcrypt.compare(testPassword, hash);
  const compareTime = Date.now() - compareStart;
  
  return {
    rounds,
    hashTime,
    compareTime,
  };
}

export default {
  hashPassword,
  comparePassword,
  getBcryptInfo,
  benchmarkBcrypt,
};
