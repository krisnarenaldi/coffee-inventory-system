"use client";

import type { JSX } from 'react';
import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Users,
  Package,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  interval: "MONTHLY" | "YEARLY";
  maxUsers: number | null;
  maxIngredients: number | null;
  maxBatches: number | null;
  maxStorageLocations?: number | null;
  maxRecipes?: number | null;
  maxProducts?: number | null;
  features: Record<string, boolean> | string[];
  isActive?: boolean;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

interface UsageData {
  users: number;
  ingredients: number;
  batches: number;
}

type BillingCycle = "monthly" | "yearly";


const SubscriptionContent = (): JSX.Element | null => {
  // Authentication and routing
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management with proper types
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("monthly");
  const [upgradeCalculation, setUpgradeCalculation] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);

  // Helper functions
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return "N/A";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Invalid Date";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getUsagePercentage = (current: number, max: number | null): number => {
    if (max === null || max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return "text-green-600 bg-green-100";
      case 'TRIALING':
        return "text-blue-600 bg-blue-100";
      case 'PAST_DUE':
      case 'UNPAID':
        return "text-yellow-600 bg-yellow-100";
      case 'CANCELLED':
      case 'EXPIRED':
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };


  // Derive if current subscription period is yearly based on period length
  const isCurrentCycleYearly = React.useMemo(() => {
    if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd) {
      return subscription?.plan?.interval === "YEARLY";
    }
    try {
      const start = new Date(subscription.currentPeriodStart);
      const end = new Date(subscription.currentPeriodEnd);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 300; // treat ~10 months+ as yearly period
    } catch {
      return subscription?.plan?.interval === "YEARLY";
    }
  }, [subscription?.currentPeriodStart, subscription?.currentPeriodEnd, subscription?.plan?.interval]);

  // Helper function to calculate price for cycle (moved outside to avoid recreation)
  const getPriceForCycle = (
    plan: SubscriptionPlan | undefined,
    cycle: "monthly" | "yearly"
  ) => {
    if (!plan) return 0;
    const base = Number(plan.price) || 0;
    if (cycle === "yearly") {
      return plan.interval === "YEARLY" ? base : Math.round(base * 12 * 0.8);
    }
    return base;
  };

  // Memoize calculateUpgradeOptions to prevent infinite re-renders
  const calculateUpgradeOptions = React.useCallback(async () => {
    if (!selectedPlan || !subscription) return;

    const newPlan = availablePlans.find((p) => p.id === selectedPlan);
    if (!newPlan) return;

    // Check if this is a renewal case for expired subscription
    const now = new Date();
    const currentPeriodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null;
    const remainingDays = currentPeriodEnd
      ? Math.ceil(
          (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;
    const isExpired = remainingDays <= 0;
    const isSamePlan = newPlan.id === subscription.plan.id;

    // For same plan selection
    if (isSamePlan) {
      if (isExpired) {
        // Expired subscription renewal - show renewal calculation
        const renewalPrice = getPriceForCycle(newPlan, selectedCycle);
        setUpgradeCalculation({
          currentPlan: subscription.plan,
          newPlan: newPlan,
          remainingDays: 0,
          unusedCurrentValue: 0, // No unused value for expired subscription
          newPlanProratedCost: renewalPrice, // Full price for renewal
          additionalCharge: renewalPrice, // User pays full price
          isRenewal: true,
          isExpired: true,
          currentPeriodEnd: currentPeriodEnd,
          nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        });
        return;
      } else {
        // Active subscription - no calculation needed (will be blocked anyway)
        setUpgradeCalculation(null);
        return;
      }
    }

    // For expired subscriptions with different plans, show full price
    if (isExpired && !isSamePlan) {
      const fullPrice = getPriceForCycle(newPlan, selectedCycle);
      setUpgradeCalculation({
        currentPlan: subscription.plan,
        newPlan: newPlan,
        remainingDays: 0,
        unusedCurrentValue: 0, // No unused value for expired subscription
        newPlanProratedCost: fullPrice, // Full price for new plan
        additionalCharge: fullPrice, // Full price for new plan
        currentPeriodEnd: currentPeriodEnd,
        nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
      return;
    }

    // For plan changes (not renewals), calculate proration
    if (!currentPeriodEnd) {
      // Handle case where currentPeriodEnd is null
      setUpgradeCalculation(null);
      return;
    }

    // Clamp remaining days to 0 to avoid negative values after expiry
    const rawRemainingDays = Math.ceil(
      (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const clampedRemainingDays = Math.max(0, rawRemainingDays);

    // Calculate current plan daily rate
    const currentPeriodStart = new Date(subscription.currentPeriodStart);
    const totalCurrentDays = Math.ceil(
      (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    
    // Map current plan price to the enforced/selected cycle for fair comparison
    const currentPriceForCycle = getPriceForCycle(subscription.plan, selectedCycle);
    const currentDailyRate = Number(currentPriceForCycle) / totalCurrentDays;

    // Align with backend: use total days in current period for both plans
    const priceForNewPlanCycle = getPriceForCycle(newPlan, selectedCycle);
    const newDailyRate = Number(priceForNewPlanCycle) / totalCurrentDays;

    // Calculate unused current plan value
    const unusedCurrentValue = currentDailyRate * clampedRemainingDays;

    // Calculate new plan cost for remaining period
    const newPlanProratedCost = newDailyRate * clampedRemainingDays;

    // Calculate additional charge for immediate upgrade
    const additionalCharge = Math.max(
      0,
      newPlanProratedCost - unusedCurrentValue
    );

    setUpgradeCalculation({
      currentPlan: subscription.plan,
      newPlan: newPlan,
      remainingDays: clampedRemainingDays,
      unusedCurrentValue: unusedCurrentValue,
      newPlanProratedCost: newPlanProratedCost,
      additionalCharge: additionalCharge,
      currentPeriodEnd: currentPeriodEnd,
      nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }, [selectedPlan, subscription, availablePlans, selectedCycle]);

  // Calculate upgrade pricing when plan or option changes
  useEffect(() => {
    if (selectedPlan && subscription) {
      calculateUpgradeOptions();
    }
  }, [selectedPlan, subscription, calculateUpgradeOptions]);

  // Debug modal state changes
  useEffect(() => {
    console.log("🔧 MODAL STATE CHANGED:", showUpgradeModal);
  }, [showUpgradeModal]);

  // Enforce billing cycle selection for yearly subscribers when opening the modal
  useEffect(() => {
    if (!showUpgradeModal) return;
    if (isCurrentCycleYearly) {
      setSelectedCycle("yearly");
    }
  }, [showUpgradeModal, isCurrentCycleYearly]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showUpgradeModal) {
        e.preventDefault();
        setShowUpgradeModal(false);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [showUpgradeModal]);

  // Handle URL parameters for expired/error states
  useEffect(() => {
    console.log("🔍 CHECKING URL PARAMS:", { isExpired, hasError });
    if (isExpired || hasError) {
      console.log("🚨 OPENING MODAL DUE TO URL PARAMS");
      setShowUpgradeModal(true);
    }
  }, [isExpired, hasError]);

  // Derive if current subscription period is yearly based on period length
  const isCurrentCycleYearly = React.useMemo(() => {
    if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd) {
      return subscription?.plan?.interval === "YEARLY";
    }
    try {
      const start = new Date(subscription.currentPeriodStart);
      const end = new Date(subscription.currentPeriodEnd);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 300; // treat ~10 months+ as yearly period
    } catch {
      return subscription?.plan?.interval === "YEARLY";
    }
  }, [subscription?.currentPeriodStart, subscription?.currentPeriodEnd, subscription?.plan?.interval]);

  // Ensure selectedCycle reflects current cycle when subscription changes
  useEffect(() => {
    if (isCurrentCycleYearly && selectedCycle !== "yearly") {
      setSelectedCycle("yearly");
    }
  }, [isCurrentCycleYearly]);

  // Check and reconcile pending checkout for current tenant (user-scoped)
  useEffect(() => {
    const checkPendingCheckout = async () => {
      if (!session?.user?.tenantId) return;

      try {
        const response = await fetch("/api/subscription/pending-checkout");
        if (response.ok) {
          const result = await response.json();
          // Only show success if activation happened for THIS tenant
          if (result.activated === true) {
            setActionMessage({
              type: "success",
              text: "🎉 Your scheduled upgrade has been activated!",
            });
            await fetchSubscriptionData();
          }
        }
      } catch (error) {
        console.error("Error checking pending checkout:", error);
      }
    };

    if (session?.user?.tenantId) {
      checkPendingCheckout();
    }
  }, [session?.user?.tenantId]);

  // Authentication protection
  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (session?.user) {
          // Use Promise.allSettled to handle individual API failures gracefully
          const results = await Promise.allSettled([
            fetchSubscriptionData(),
            fetchAvailablePlans(),
            fetchUsageData(),
            fetchSubscriptionMessage(),
          ]);

          // Log any failed API calls
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              const apiNames = ["subscription", "plans", "usage", "status"];
              console.error(
                `Failed to fetch ${apiNames[index]}:`,
                result.reason
              );
            }
          });
        } else if (session === null) {
          // No session available (user not authenticated)
          // Still fetch available plans and subscription message for expired users
          const results = await Promise.allSettled([
            fetchAvailablePlans(),
            fetchSubscriptionMessage(),
          ]);

          // Log any failed API calls
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              const apiNames = ["plans", "status"];
              console.error(
                `Failed to fetch ${apiNames[index]}:`,
                result.reason
              );
            }
          });
        }
        // If session is still undefined (loading), don't set loading to false yet
      } catch (error) {
        console.error("Error loading subscription data:", error);
      } finally {
        // Only set loading to false if session is not undefined (still loading)
        if (session !== undefined) {
          console.log("🔧 SUBSCRIPTION PAGE: Setting loading to false");
          setLoading(false);
        }
      }
    };

    // Only load data if session state is resolved (not undefined)
    if (session !== undefined) {
      loadData();
    }

    // Fallback: ensure loading is set to false after a timeout
    const timeout = setTimeout(() => {
      console.log(
        "⏰ SUBSCRIPTION PAGE: Timeout reached, forcing loading to false"
      );
      setLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [session]);

  const fetchSubscriptionMessage = async () => {
    try {
      const response = await fetch("/api/subscription/status");
      if (response.ok) {
        const data = await response.json();
        const message = data.message;
        if (typeof message === "string") {
          setSubscriptionMessage(message);
        } else if (message && typeof message === "object") {
          console.warn(
            "⚠️ Subscription message is an object, ignoring:",
            message
          );
          setSubscriptionMessage(null);
        } else {
          setSubscriptionMessage(null);
        }
      }
    } catch (error) {
      console.error("Error fetching subscription message:", error);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage({
          type: "error",
          text: data?.error || "Failed to reactivate subscription.",
        });
        return;
      }

      await fetchSubscriptionData();
      setActionMessage({
        type: "success",
        text:
          data?.message ||
          "Downgrade cancelled. You will keep your current plan.",
      });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      setActionMessage({
        type: "error",
        text: "Failed to reactivate. Please try again.",
      });
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      } else {
        console.error(
          "Failed to fetch subscription data:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch("/api/subscription/plans");
      if (response.ok) {
        const data = await response.json();
        setAvailablePlans(data);
      } else {
        console.error(
          "Failed to fetch plans:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const fetchUsageData = async () => {
    try {
      const response = await fetch("/api/subscription/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      } else {
        console.error(
          "Failed to fetch usage data:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      // Determine selected plan details and compare price
      const chosenPlan = availablePlans.find((p) => p.id === selectedPlan);
      if (!chosenPlan || !subscription) return;

      // Check if user can select this plan based on subscription status
      const now = new Date();
      const currentPeriodEnd = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null;
      const remainingDays = currentPeriodEnd
        ? Math.ceil(
            (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
      const isExpired = remainingDays <= 0;
      const isSamePlan = chosenPlan.id === subscription.plan.id;
      const isFreeplan =
        chosenPlan.name?.toLowerCase() === "free" ||
        chosenPlan.id === "free-plan";

      // Business logic for plan selection
      if (!isExpired && isSamePlan) {
        // Active subscription: cannot renew to same plan
        setActionMessage({
          type: "error",
          text: `You are already on the ${subscription.plan.name} plan. You can upgrade or downgrade to other plans, but cannot renew the same plan until it expires.`,
        });
        return;
      }

      if (isFreeplan) {
        // Never allow selection of Free plan through this interface
        setActionMessage({
          type: "error",
          text: "Free plan selection is not available through this interface.",
        });
        return;
      }

      // If expired and same plan: this is a renewal (allowed)
      // If expired and different plan: this is a plan change (allowed)
      // If active and different plan: this is an upgrade/downgrade (allowed)

      const currentPrice = parseFloat(String(subscription.plan.price));
      const getPriceForCycle = (
        plan: SubscriptionPlan,
        cycle: "monthly" | "yearly"
      ) => {
        const base = Number(plan.price) || 0;
        if (cycle === "yearly") {
          return plan.interval === "YEARLY"
            ? base
            : Math.round(base * 12 * 0.8);
        }
        return base;
      };
      const newPrice = getPriceForCycle(chosenPlan, selectedCycle);
      const isUpgrade = newPrice > currentPrice;
      const isDowngrade = newPrice < currentPrice;
      // Only treat expired SAME PLAN selection as a renewal requiring checkout
      const isRenewal = isExpired && isSamePlan;

      // Route renewals and upgrades to the upgrade endpoint (requires payment)
      // CRITICAL FIX: Expired downgrades should go to change-plan endpoint, not upgrade endpoint
      if ((isUpgrade || isRenewal) && !isDowngrade) {
        // Use upgrade endpoint for upgrades and renewals (will redirect to checkout)
        const upgradePayload = {
          planId: selectedPlan,
          upgradeOption: "immediate",
          billingCycle: selectedCycle,
        };

        const response = await fetch("/api/subscription/upgrade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(upgradePayload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setActionMessage({
            type: "error",
            text: data?.error || "Failed to start upgrade.",
          });
          return;
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        // No checkout URL returned; refresh and close modal
        await fetchSubscriptionData();
        setShowUpgradeModal(false);
        setActionMessage({ type: "success", text: "Upgrade initialized." });
        return;
      }

      // Downgrade or lateral change (not renewal): call change-plan endpoint
      const response = await fetch("/api/subscription/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          newPlanId: selectedPlan,
          effectiveDate: "immediate",
          billingCycle: selectedCycle,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage({
          type: "error",
          text: data?.error || "Failed to change plan.",
        });
        return;
      }

      // CRITICAL FIX: Handle payment requirement for expired subscription plan changes
      if (data.requiresPayment) {
        // For expired subscriptions changing plans, redirect to checkout
        const checkoutParams = new URLSearchParams({
          plan: selectedPlan,
          cycle: selectedCycle,
          transactionId: data.transactionId,
        });

        const checkoutUrl = `/checkout?${checkoutParams.toString()}`;
        window.location.href = checkoutUrl;
        return;
      }

      if (data?.subscription) {
        setSubscription(data.subscription);
      } else {
        await fetchSubscriptionData();
      }
      setShowUpgradeModal(false);
      setActionMessage({
        type: "success",
        text: data?.message || "Plan updated successfully.",
      });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      setActionMessage({
        type: "error",
        text: "Unexpected error. Please try again.",
      });
    }
  };

  const handleDowngradeAtPeriodEnd = async () => {
    const currentPlanName = subscription?.plan?.name || "current plan";
    const isDowngradeToFree = currentPlanName.toLowerCase() !== "free";

    const confirmMessage = `Are you sure you want to downgrade your ${currentPlanName} plan? You will keep access to all ${currentPlanName.toLowerCase()} features until ${formatDate(
      subscription?.currentPeriodEnd
    )}, then your plan will automatically downgrade to Free.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });

      if (response.ok) {
        await fetchSubscriptionData();
        setActionMessage({
          type: "success",
          text: `Your ${currentPlanName} plan will downgrade to Free on ${formatDate(
            subscription?.currentPeriodEnd
          )}. You can reactivate anytime before then.`,
        });
      }
    } catch (error) {
      console.error("Error scheduling downgrade:", error);
      setActionMessage({
        type: "error",
        text: "Failed to schedule downgrade. Please try again.",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 bg-green-100";
      case "TRIALING":
        return "text-blue-600 bg-blue-100";
      case "PAST_DUE":
        return "text-yellow-600 bg-yellow-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      case "EXPIRED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Handle loading and authentication states
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // Handle loading and authentication states
  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  // Return null if no session
  if (!session) {
    return null;
  }

  // ... rest of your code ...

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Home Page Link with Logo */}
        {/* ... rest of your code ... */}
      </div>
    </div>
  );
};

const SubscriptionPage = (): JSX.Element => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
};

export default SubscriptionPage;
