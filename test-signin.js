// Test NextAuth signIn function directly
const { signIn } = require('next-auth/react');
const fetch = require('node-fetch');

async function testSignIn() {
  try {
    console.log('🔍 Testing NextAuth signIn function');
    
    // Test using fetch to simulate the signin process
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    console.log('✅ CSRF Token obtained:', csrfData.csrfToken);
    
    // Test the credentials endpoint with proper form data
    const formData = new URLSearchParams();
    formData.append('email', 'admin@demo.com');
    formData.append('password', 'demo123');
    formData.append('tenantSubdomain', 'demo');
    formData.append('csrfToken', csrfData.csrfToken);
    formData.append('callbackUrl', 'http://localhost:3000/dashboard');
    formData.append('json', 'true');
    
    console.log('📤 Sending signin request...');
    
    const signinResponse = await fetch('http://localhost:3000/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual'
    });
    
    console.log('📥 Response status:', signinResponse.status);
    console.log('📥 Response headers:', Object.fromEntries(signinResponse.headers.entries()));
    
    if (signinResponse.status === 200) {
      const responseText = await signinResponse.text();
      console.log('✅ Success response:', responseText);
    } else {
      const responseText = await signinResponse.text();
      console.log('❌ Error response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error testing signin:', error);
  }
}

testSignIn();