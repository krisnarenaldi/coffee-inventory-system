"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function DebugSubscriptionWarning() {
  const { data: session, status } = useSession();
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setApiError(null);
    setApiResponse(null);

    try {
      console.log("🔍 Testing /api/subscription/warning endpoint...");
      const response = await fetch("/api/subscription/warning");

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", Object.fromEntries(response.headers));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("📊 API Response data:", data);
      setApiResponse(data);
    } catch (error) {
      console.error("❌ API Error:", error);
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      testAPI();
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Debug Subscription Warning
        </h1>

        {/* Session Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Information</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {status}</p>
            {session?.user && (
              <>
                <p><strong>User ID:</strong> {session.user.id}</p>
                <p><strong>Email:</strong> {session.user.email}</p>
                <p><strong>Role:</strong> {session.user.role}</p>
                <p><strong>Tenant ID:</strong> {session.user.tenantId}</p>
                <p><strong>Tenant Subdomain:</strong> {session.user.tenantSubdomain}</p>
                <p><strong>Subscription Expired:</strong> {session.user.subscriptionExpired ? "Yes" : "No"}</p>
              </>
            )}
          </div>
        </div>

        {/* Current URL Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current URL Information</h2>
          <div className="space-y-2">
            <p><strong>Hostname:</strong> {typeof window !== "undefined" ? window.location.hostname : "N/A"}</p>
            <p><strong>Full URL:</strong> {typeof window !== "undefined" ? window.location.href : "N/A"}</p>
            <p><strong>Pathname:</strong> {typeof window !== "undefined" ? window.location.pathname : "N/A"}</p>
          </div>
        </div>

        {/* API Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Test Results</h2>

          <button
            onClick={testAPI}
            disabled={loading || status !== "authenticated"}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded mb-4"
          >
            {loading ? "Testing..." : "Test API"}
          </button>

          {status !== "authenticated" && (
            <p className="text-yellow-600 mb-4">
              Please log in to test the API endpoint.
            </p>
          )}

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <h3 className="font-semibold text-red-800">API Error:</h3>
              <pre className="text-red-700 text-sm mt-2">{apiError}</pre>
            </div>
          )}

          {apiResponse && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold text-green-800 mb-2">API Response:</h3>
              <pre className="text-green-700 text-sm overflow-x-auto">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>

              <div className="mt-4 pt-4 border-t border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Expected Toast Behavior:</h4>
                {apiResponse.shouldWarn ? (
                  <div className="text-green-700">
                    ✅ Toast SHOULD be displayed with message: "{apiResponse.message}"
                  </div>
                ) : (
                  <div className="text-green-700">
                    ❌ Toast should NOT be displayed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expected Tenant Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Expected Tenant Info</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Target Tenant ID:</strong> cmghev0c50001yi3lj42ckskc</p>
            <p><strong>Target Subdomain:</strong> kopi-bird</p>
            <p><strong>Expected URL:</strong> http://kopi-bird.localhost:3000</p>
            <p><strong>Expected Status:</strong> Expired but in grace period</p>
            <p><strong>Expected Message:</strong> "Don't lose your data. Renew now."</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded p-6 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">Debugging Instructions:</h3>
          <ol className="text-blue-700 text-sm space-y-1">
            <li>1. Make sure you're accessing: <code>http://kopi-bird.localhost:3000/debug-subscription-warning</code></li>
            <li>2. Log in with a user account for the "Kopi Bird" tenant</li>
            <li>3. Check that the session shows the correct tenant ID</li>
            <li>4. Test the API and verify the response</li>
            <li>5. If API returns shouldWarn: true, the toast should appear on other pages</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
