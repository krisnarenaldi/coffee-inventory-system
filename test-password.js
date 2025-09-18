const bcrypt = require('bcryptjs');

// Hash from database
const hashFromDB = '$2a$12$z.DV8R92ICmEbzapXw4X8eFmd5cVluPPiP3R/2nraRX3VlMeFqBba';

// Test password
const testPassword = 'demo123';

// Verify password
bcrypt.compare(testPassword, hashFromDB, (err, result) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log(`Password '${testPassword}' matches hash:`, result);
  
  if (!result) {
    console.log('\nTesting other common passwords...');
    const commonPasswords = ['admin', 'password', 'demo', '123456', 'admin123'];
    
    commonPasswords.forEach(pwd => {
      bcrypt.compare(pwd, hashFromDB, (err, match) => {
        if (match) {
          console.log(`✅ Found matching password: '${pwd}'`);
        }
      });
    });
  }
});

// Also generate a new hash for demo123 to compare
bcrypt.hash('demo123', 12, (err, newHash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('\nNew hash for demo123:', newHash);
});