'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FeatureFlagContext, FeatureFlagResult } from '../lib/feature-flags';

interface UseFeatureFlagResult {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  result: FeatureFlagResult | null;
}

interface UseFeatureFlagsResult {
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  results: Record<string, FeatureFlagResult>;
}

// Hook for evaluating a single feature flag
export function useFeatureFlag(
  flagKey: string,
  customContext?: Partial<FeatureFlagContext>
): UseFeatureFlagResult {
  const { data: session } = useSession();
  const [state, setState] = useState<UseFeatureFlagResult>({
    isEnabled: false,
    isLoading: true,
    error: null,
    result: null
  });

  useEffect(() => {
    let isMounted = true;

    async function evaluateFlag() {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const context: FeatureFlagContext = {
          userId: session?.user?.id,
          tenantId: session?.user?.tenantId,
          userRole: session?.user?.role,
          subscriptionPlan: session?.user?.tenant?.subscriptionPlan,
          ...customContext
        };

        const response = await fetch('/api/feature-flags/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            flagKey,
            context
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setState({
            isEnabled: data.result.isEnabled,
            isLoading: false,
            error: null,
            result: data.result
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            isEnabled: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            result: null
          });
        }
      }
    }

    if (flagKey) {
      evaluateFlag();
    }

    return () => {
      isMounted = false;
    };
  }, [flagKey, session?.user?.id, session?.user?.tenantId, session?.user?.role, customContext]);

  return state;
}

// Hook for evaluating multiple feature flags
export function useFeatureFlags(
  flagKeys: string[],
  customContext?: Partial<FeatureFlagContext>
): UseFeatureFlagsResult {
  const { data: session } = useSession();
  const [state, setState] = useState<UseFeatureFlagsResult>({
    flags: {},
    isLoading: true,
    error: null,
    results: {}
  });

  useEffect(() => {
    let isMounted = true;

    async function evaluateFlags() {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const context: FeatureFlagContext = {
          userId: session?.user?.id,
          tenantId: session?.user?.tenantId,
          userRole: session?.user?.role,
          subscriptionPlan: session?.user?.tenant?.subscriptionPlan,
          ...customContext
        };

        const response = await fetch('/api/feature-flags/evaluate-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            flagKeys,
            context
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          const flags: Record<string, boolean> = {};
          const results: Record<string, FeatureFlagResult> = {};

          Object.entries(data.results).forEach(([key, result]) => {
            const flagResult = result as FeatureFlagResult;
            flags[key] = flagResult.isEnabled;
            results[key] = flagResult;
          });

          setState({
            flags,
            isLoading: false,
            error: null,
            results
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            flags: {},
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results: {}
          });
        }
      }
    }

    if (flagKeys.length > 0) {
      evaluateFlags();
    }

    return () => {
      isMounted = false;
    };
  }, [flagKeys.join(','), session?.user?.id, session?.user?.tenantId, session?.user?.role, customContext]);

  return state;
}

// Hook for common feature flags with predefined keys
export function useCommonFeatureFlags(customContext?: Partial<FeatureFlagContext>) {
  const commonFlags = [
    'multi_tenant_support',
    'subscription_billing',
    'qr_code_scanning',
    'advanced_analytics',
    'ai_recommendations',
    'mobile_app_support',
    'new_dashboard_ui',
    'batch_operations',
    'inventory_forecasting',
    'platform_admin_panel',
    'system_health_monitoring',
    'redis_caching',
    'cdn_optimization'
  ];

  return useFeatureFlags(commonFlags, customContext);
}

// Higher-order component for feature flag gating
export function withFeatureFlag<P extends object>(
  flagKey: string,
  fallbackComponent?: React.ComponentType<P>
) {
  return function (WrappedComponent: React.ComponentType<P>) {
    return function FeatureFlagGatedComponent(props: P) {
      const { isEnabled, isLoading } = useFeatureFlag(flagKey);

      if (isLoading) {
        return React.createElement('div', null, 'Loading...');
      }

      if (!isEnabled) {
        if (fallbackComponent) {
          return React.createElement(fallbackComponent, props);
        }
        return null;
      }

      return React.createElement(WrappedComponent, props);
    };
  };
}

// Component for conditional rendering based on feature flags
interface FeatureFlagProps {
  flagKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: Partial<FeatureFlagContext>;
}

export function FeatureFlag({ flagKey, children, fallback, context }: FeatureFlagProps) {
  const { isEnabled, isLoading } = useFeatureFlag(flagKey, context);

  if (isLoading) {
    return React.createElement('div', null, 'Loading...');
  }

  if (!isEnabled) {
    return fallback ? React.createElement(React.Fragment, null, fallback) : null;
  }

  return React.createElement(React.Fragment, null, children);
}

// Hook for feature flag admin operations (for admin users)
export function useFeatureFlagAdmin() {
  const [flags, setFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/feature-flags');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFlags(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const createFlag = async (flagData: any) => {
    try {
      setError(null);

      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(flagData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await fetchFlags(); // Refresh the list
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateFlag = async (flagKey: string, flagData: any) => {
    try {
      setError(null);

      const response = await fetch(`/api/admin/feature-flags/${flagKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(flagData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await fetchFlags(); // Refresh the list
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteFlag = async (flagKey: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/admin/feature-flags/${flagKey}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchFlags(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return {
    flags,
    isLoading,
    error,
    fetchFlags,
    createFlag,
    updateFlag,
    deleteFlag
  };
}