"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function DebugFeatures() {
  const { data: session } = useSession();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkFeatures = async () => {
    if (!session?.user?.tenantId) return;
    
    setLoading(true);
    const features = ['basicReports', 'advancedReports', 'analytics'];
    const results: any = {};
    
    for (const feature of features) {
      try {
        const response = await fetch(
          `/api/subscription/features?feature=${feature}&t=${Date.now()}`,
          {
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
        const data = await response.json();
        results[feature] = {
          status: response.status,
          hasAccess: data.hasAccess,
          error: data.error,
          raw: data
        };
      } catch (error) {
        results[feature] = {
          status: 'ERROR',
          error: error.message
        };
      }
    }
    
    setResults(results);
    setLoading(false);
  };

  useEffect(() => {
    if (session?.user?.tenantId) {
      checkFeatures();
    }
  }, [session?.user?.tenantId]);

  if (!session) {
    return <div className="p-8">Not logged in</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Feature Access Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-semibold mb-2">Session Info:</h2>
        <p><strong>User ID:</strong> {session.user?.id}</p>
        <p><strong>Email:</strong> {session.user?.email}</p>
        <p><strong>Tenant ID:</strong> {session.user?.tenantId}</p>
      </div>

      <button 
        onClick={checkFeatures}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6 disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Refresh Feature Check'}
      </button>

      {results && (
        <div className="space-y-4">
          {Object.entries(results).map(([feature, result]: [string, any]) => (
            <div key={feature} className="border p-4 rounded">
              <h3 className="font-semibold text-lg mb-2">
                {feature} {result.hasAccess ? '✅' : '❌'}
              </h3>
              <div className="text-sm space-y-1">
                <p><strong>Status:</strong> {result.status}</p>
                <p><strong>Has Access:</strong> {String(result.hasAccess)}</p>
                {result.error && <p><strong>Error:</strong> {result.error}</p>}
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Raw Response</summary>
                  <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(result.raw, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
