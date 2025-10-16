"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  features: string[];
}

interface CheckoutData {
  snapToken: string;
  orderId: string;
  amount: number;
  planName: string;
  billingCycle: string;
}

declare global {
  interface Window {
    snap: {
      pay: (token: string, options?: any) => void;
    };
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planMismatchError, setPlanMismatchError] = useState<{
    intendedPlan: string;
    requestedPlan: string;
  } | null>(null);

  const planId = searchParams.get("plan");
  const billingCycle = searchParams.get("cycle") || "monthly";
  const upgradeOption = searchParams.get("upgradeOption");
  const customAmount = searchParams.get("amount");
  const bypassValidation = searchParams.get("bypass") === "true";

  // Debug URL parameters
  console.log("🔍 URL DEBUG: planId from URL =", planId);
  console.log(
    "🔍 URL DEBUG: All search params =",
    Object.fromEntries(searchParams.entries()),
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (!planId) {
      router.push("/pricing");
      return;
    }

    // Validate user's intended plan before allowing checkout
    if (bypassValidation) {
      console.log(
        "🔍 CHECKOUT DEBUG: Bypassing validation, loading plan directly",
      );
      fetchPlan();
    } else {
      validateUserAccess();
    }

    // Add timeout for loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.error(
          "🔍 CHECKOUT DEBUG: Loading timeout - forcing error state",
        );
        setLoading(false);
        setError("Loading timeout. Please refresh the page or try again.");
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [planId, status]);

  useEffect(() => {
    // Check if window is defined (browser environment)
    if (typeof window === "undefined") return;

    // Check if Midtrans Snap script is already loaded
    const existingScript =
      document.querySelector('script[src*="snap.js"]') ||
      document.getElementById("midtrans-snap-script");

    if (existingScript || window.snap) {
      console.log("Midtrans script already loaded or available");
      return;
    }

    // Load Midtrans Snap script
    const script = document.createElement("script");
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

    if (!clientKey) {
      console.error("Midtrans client key not found");
      return;
    }

    const inferredProd = clientKey ? !clientKey.startsWith("SB-") : false;
    const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION
      ? process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      : inferredProd;

    const scriptSrc = isProd
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

    script.src = scriptSrc;
    script.setAttribute("data-client-key", clientKey);
    script.id = "midtrans-snap-script";
    script.async = true;

    // Add error handling
    script.onerror = () => {
      console.error("Failed to load Midtrans Snap script");
      toast.error("Failed to load payment system. Please refresh the page.");
    };

    script.onload = () => {
      console.log("Midtrans Snap script loaded successfully");
    };

    document.head.appendChild(script);

    return () => {
      // Clean up only if we're unmounting
      const scriptToRemove = document.getElementById("midtrans-snap-script");
      if (scriptToRemove && scriptToRemove.parentNode) {
        try {
          document.head.removeChild(scriptToRemove);
        } catch (e) {
          console.warn("Script already removed:", e);
        }
      }
    };
  }, []);

  const validateUserAccess = async () => {
    try {
      console.log("🔍 CHECKOUT DEBUG: Starting validation for planId:", planId);

      // Check if plan exists in URL
      if (!planId) {
        console.error("🔍 CHECKOUT DEBUG: No planId provided");
        router.push("/dashboard");
        return;
      }

      // Check user's intended plan first
      const subscriptionResponse = await fetch("/api/subscription");
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        console.log("🔍 CHECKOUT DEBUG: Subscription data:", subscriptionData);

        if (
          subscriptionData.status === "PENDING_CHECKOUT" &&
          subscriptionData.intendedPlan
        ) {
          const intendedPlan = subscriptionData.intendedPlan;
          const expectedPlanId = intendedPlan; // Keep it as-is, don't convert

          console.log("🔍 CHECKOUT DEBUG: intendedPlan =", intendedPlan);
          console.log("🔍 CHECKOUT DEBUG: planId from URL =", planId);
          console.log("🔍 CHECKOUT DEBUG: expectedPlanId =", expectedPlanId);

          // Check if user is trying to access wrong plan
          if (planId !== expectedPlanId) {
            console.log(
              "🔍 CHECKOUT DEBUG: Plan mismatch detected, showing error",
            );
            setPlanMismatchError({
              intendedPlan: intendedPlan,
              requestedPlan: planId,
            });
            toast.error(
              `URL manipulation detected! You can only checkout your intended plan: ${intendedPlan}`,
            );
            setLoading(false);
            return;
          }
        }
      }

      console.log("🔍 CHECKOUT DEBUG: Validation passed, loading plan");
      await fetchPlan();
    } catch (error) {
      console.error("🔍 CHECKOUT DEBUG: Error in validateUserAccess:", error);
      setLoading(false);
      setError("Unable to validate checkout permissions. Please try again.");
      toast.error("Unable to load checkout page. Please try again.");
    }
  };

  const fetchPlan = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching plan:", planId);

      const response = await fetch(`/api/subscription/plans`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Plans API error:", response.status, errorText);
        throw new Error(`Failed to fetch plans: ${response.status}`);
      }

      const plans = await response.json();
      console.log(
        "📋 Available plans:",
        plans.map((p: any) => p.id),
      );

      // Try to find plan by exact ID first
      let selectedPlan = plans.find((p: SubscriptionPlan) => p.id === planId);

      // If not found and planId doesn't end with '-plan', try adding '-plan' suffix
      if (!selectedPlan && planId && !planId.endsWith("-plan")) {
        const planIdWithSuffix = `${planId}-plan`;
        console.log("🔍 Trying with suffix:", planIdWithSuffix);
        selectedPlan = plans.find(
          (p: SubscriptionPlan) => p.id === planIdWithSuffix,
        );
      }

      if (!selectedPlan) {
        console.error("❌ Plan not found:", planId);
        toast.error(`Subscription plan '${planId}' not found`);
        router.push("/subscription");
        return;
      }

      console.log("✅ Plan found:", selectedPlan.name, selectedPlan.id);
      setPlan(selectedPlan);
    } catch (error) {
      console.error("❌ Error fetching plan:", error);
      setError("Failed to load subscription plan. Please try again.");
      toast.error("Failed to load subscription plan");
      // Don't redirect immediately, let user see the error
    } finally {
      setLoading(false);
    }
  };

  const revertToFreePlan = async () => {
    try {
      const response = await fetch("/api/subscription/revert-to-free", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to revert to free plan");
      }
    } catch (error) {
      console.error("Error reverting to free plan:", error);
    }
  };

  const handlePayment = async () => {
    if (!plan) return;

    console.log(
      "🚀 Starting payment process for plan:",
      plan.id,
      "billing cycle:",
      billingCycle,
    );
    setProcessing(true);
    try {
      console.log("📡 Making request to /api/checkout/create-token");
      const response = await fetch("/api/checkout/create-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          upgradeOption: upgradeOption || undefined,
          customAmount: customAmount ? parseInt(customAmount) : undefined,
        }),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ API Error:", error);
        throw new Error(error.error || "Failed to create payment token");
      }

      const data: CheckoutData = await response.json();
      console.log("✅ Payment token created:", {
        orderId: data.orderId,
        hasSnapToken: !!data.snapToken,
      });
      setCheckoutData(data);

      // Check if Midtrans Snap is loaded with retry mechanism
      let retries = 0;
      const maxRetries = 10;
      const checkSnapLoaded = () => {
        if (window.snap) {
          console.log("✅ Midtrans Snap is ready");
          proceedWithPayment();
          return;
        }

        if (retries < maxRetries) {
          retries++;
          console.log(
            `⏳ Waiting for Midtrans Snap... (${retries}/${maxRetries})`,
          );
          setTimeout(checkSnapLoaded, 500);
        } else {
          console.error("❌ Midtrans Snap not loaded after retries");
          toast.error("Payment system not ready. Please refresh the page.");
          setProcessing(false);
        }
      };

      const proceedWithPayment = () => {
        console.log("💳 Opening Midtrans payment popup");
        // Open Midtrans Snap payment popup
        window.snap.pay(data.snapToken, {
          onSuccess: (result: any) => {
            console.log("✅ Payment success:", result);
            toast.success("Payment successful!");
            router.push(`/checkout/success?order_id=${data.orderId}`);
          },
          onPending: (result: any) => {
            console.log("⏳ Payment pending:", result);
            toast.info("Payment is being processed...");
            router.push(`/checkout/pending?order_id=${data.orderId}`);
          },
          onError: (result: any) => {
            console.error("❌ Payment error:", result);
            toast.error("Payment failed. Please try again.");
            router.push(`/checkout/error?order_id=${data.orderId}`);
          },
          onClose: () => {
            console.log("🚪 Payment popup closed");
            toast.info("Payment cancelled");
            // When user abandons checkout, revert to free plan
            revertToFreePlan();
          },
        });
      };

      // Start checking if Snap is loaded
      checkSnapLoaded();
    } catch (error) {
      console.error("❌ Error creating payment:", error);

      // Handle specific authorization error with plan mismatch
      if (
        error instanceof Error &&
        error.message.includes(
          "Unauthorized: You can only checkout your intended plan",
        )
      ) {
        try {
          // Try to parse the error details from the API response
          const response = await fetch("/api/subscription");
          if (response.ok) {
            const subscriptionData = await response.json();
            setPlanMismatchError({
              intendedPlan: subscriptionData.intendedPlan,
              requestedPlan: planId || "unknown",
            });
            toast.error(
              `You can only checkout your intended plan: ${subscriptionData.intendedPlan}`,
            );
          } else {
            toast.error(
              "Please use the correct checkout link from your dashboard",
            );
          }
        } catch (fetchError) {
          toast.error(
            "Please return to your dashboard and use the correct checkout link",
          );
        }
      } else {
        toast.error(error instanceof Error ? error.message : "Payment failed");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
          <p className="text-sm text-gray-400 mt-2">
            Plan: {planId} | User: {session?.user?.email}
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-2"
                variant="outline"
              >
                Refresh Page
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show plan mismatch error
  if (planMismatchError) {
    const correctPlanId = planMismatchError.intendedPlan; // Use intended plan directly

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Wrong Checkout Plan
                </h2>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-amber-800 font-medium mb-2">
                    You're trying to checkout the wrong plan!
                  </p>
                  <div className="text-sm text-amber-700 space-y-1">
                    <p>
                      • Your intended plan:{" "}
                      <strong>{planMismatchError.intendedPlan}</strong>
                    </p>
                    <p>
                      • You're trying to checkout:{" "}
                      <strong>{planMismatchError.requestedPlan}</strong>
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  For security reasons, you can only checkout the plan you
                  selected from your dashboard. Please use the correct checkout
                  link.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      console.log(
                        "🔍 REDIRECT: Going to /checkout?plan=" + correctPlanId,
                      );
                      window.location.href = `/checkout?plan=${correctPlanId}`;
                    }}
                    className="w-full"
                    size="lg"
                  >
                    Go to Correct Checkout ({planMismatchError.intendedPlan})
                  </Button>

                  <Button
                    onClick={() => router.push("/dashboard")}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!plan && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Plan Not Available</h2>
              <p className="text-gray-600 mb-4">
                {error || "Unable to load the requested subscription plan."}
              </p>
              <div className="space-y-2 text-xs text-gray-400 mb-4">
                <p>Plan ID: {planId}</p>
                <p>User: {session?.user?.email}</p>
                <p>Status: {status}</p>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Refresh Page
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => router.push("/subscription")}
                  variant="outline"
                  className="w-full"
                >
                  View Subscription Options
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isYearly = billingCycle === "yearly";
  const displayPrice = plan?.price || 0;
  const billingText = isYearly ? "per year" : "per month";

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Your Subscription
          </h1>
          <p className="text-gray-600 mt-2">
            Review your order and proceed with payment
          </p>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{plan?.name}</h3>
                  <p className="text-gray-600 text-sm">{plan?.description}</p>
                  <Badge variant="outline" className="mt-2">
                    {isYearly ? "Yearly" : "Monthly"} Billing
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    Rp {displayPrice.toLocaleString("id-ID")}
                  </div>
                  <div className="text-sm text-gray-600">{billingText}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Included Features:</h4>
                <ul className="space-y-1">
                  {plan?.features?.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span>Rp {displayPrice.toLocaleString("id-ID")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Secure payment powered by Midtrans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">
                      Multiple Payment Options
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Credit Card, Bank Transfer, E-Wallet, and more payment
                    methods available
                  </p>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full cursor-pointer"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Rp {displayPrice.toLocaleString("id-ID")}
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By proceeding, you agree to our Terms of Service and Privacy
                  Policy. Your subscription will auto-renew unless cancelled.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Back to Pricing */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              disabled={processing}
              className="cursor-pointer"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
