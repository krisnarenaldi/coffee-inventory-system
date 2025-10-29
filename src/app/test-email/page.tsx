"use client";

import { useState } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);

  const testConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-email');
      const data = await response.json();
      setConfigStatus(data);
    } catch (error) {
      setConfigStatus({ success: false, error: 'Failed to test configuration' });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to send test email' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Email Configuration Test
          </h1>

          {/* Test Configuration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              1. Test Email Configuration
            </h2>
            <button
              onClick={testConfig}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Configuration'}
            </button>
            
            {configStatus && (
              <div className={`mt-4 p-4 rounded-md ${
                configStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <pre className="text-sm">
                  {JSON.stringify(configStatus, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Send Test Email */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              2. Send Test Welcome Email
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Test User"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={sendTestEmail}
                disabled={loading || !email}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
            
            {result && (
              <div className={`mt-4 p-4 rounded-md ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <pre className="text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">
              Instructions:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. First test the email configuration to ensure SMTP connection works</li>
              <li>2. Then send a test welcome email to verify the email template</li>
              <li>3. Check your email inbox (and spam folder) for the test email</li>
              <li>4. Remove this test page before production deployment</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">
              Troubleshooting Zoho SMTP:
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• If you have 2FA enabled, you need an <strong>App Password</strong></li>
              <li>• Go to Zoho Mail → Settings → Security → App Passwords</li>
              <li>• Generate a new app password for "SMTP"</li>
              <li>• Use the app password instead of your regular password</li>
              <li>• Make sure SMTP is enabled in your Zoho account settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}