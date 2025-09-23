const { getBcryptInfo, benchmarkBcrypt } = require('./lib/password-utils');

async function testBcryptPerformance() {
  console.log('🔐 Testing bcrypt performance configuration...\n');
  
  // Show current configuration
  const info = getBcryptInfo();
  console.log('📋 Current bcrypt configuration:');
  console.log('- Rounds:', info.rounds);
  console.log('- Environment:', info.environment);
  console.log('- Estimated hash time:', info.estimatedHashTime);
  console.log('- Security level:', info.securityLevel);
  console.log('- BCRYPT_ROUNDS env var:', process.env.BCRYPT_ROUNDS || 'Not set');
  
  console.log('\n⚡ Running performance benchmark...');
  
  try {
    // Test current configuration
    const currentBenchmark = await benchmarkBcrypt();
    console.log(`\n📊 Current performance (${currentBenchmark.rounds} rounds):`);
    console.log(`- Hash time: ${currentBenchmark.hashTime}ms`);
    console.log(`- Compare time: ${currentBenchmark.compareTime}ms`);
    console.log(`- Total auth impact: ~${currentBenchmark.compareTime}ms per login`);
    
    // Test with 10 rounds for comparison
    if (currentBenchmark.rounds !== 10) {
      console.log('\n🚀 Testing with 10 rounds (faster option):');
      const fastBenchmark = await benchmarkBcrypt(10);
      console.log(`- Hash time: ${fastBenchmark.hashTime}ms`);
      console.log(`- Compare time: ${fastBenchmark.compareTime}ms`);
      console.log(`- Speed improvement: ${Math.round(((currentBenchmark.compareTime - fastBenchmark.compareTime) / currentBenchmark.compareTime) * 100)}% faster`);
    }
    
    // Test with 12 rounds for comparison
    if (currentBenchmark.rounds !== 12) {
      console.log('\n🔒 Testing with 12 rounds (production security):');
      const secureBenchmark = await benchmarkBcrypt(12);
      console.log(`- Hash time: ${secureBenchmark.hashTime}ms`);
      console.log(`- Compare time: ${secureBenchmark.compareTime}ms`);
      console.log(`- Security vs speed trade-off: ${Math.round(((secureBenchmark.compareTime - currentBenchmark.compareTime) / currentBenchmark.compareTime) * 100)}% slower but more secure`);
    }
    
  } catch (error) {
    console.error('❌ Error running benchmark:', error);
  }
  
  console.log('\n💡 Recommendations:');
  console.log('- For development: Add BCRYPT_ROUNDS=10 to your .env file');
  console.log('- For production: Use BCRYPT_ROUNDS=12 (default) for maximum security');
  console.log('- Current setup will automatically use 10 rounds in development, 12 in production');
  
  console.log('\n📝 To use faster authentication in development:');
  console.log('1. Add this line to your .env file:');
  console.log('   BCRYPT_ROUNDS=10');
  console.log('2. Restart your development server');
  console.log('3. Authentication should be ~50% faster');
}

testBcryptPerformance();
