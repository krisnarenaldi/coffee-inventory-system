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

  const planId = searchParams.get("plan");
  const billingCycle = searchParams.get("cycle") || "monthly";
  const upgradeOption = searchParams.get("upgradeOption");
  const customAmount = searchParams.get("amount");

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
    validateUserAccess();
  }, [planId, status]);

  useEffect(() => {
    // Load Midtrans Snap script
    const script = document.createElement("script");
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    const inferredProd = clientKey ? !clientKey.startsWith("SB-") : false;
    const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION
      ? process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      : inferredProd;
    script.src = isProd
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const validateUserAccess = async () => {
    try {
      // First check if user has permission to access this checkout
      const subscriptionResponse = await fetch("/api/subscription");
      if (!subscriptionResponse.ok) {
        throw new Error("Failed to fetch subscription status");
      }

      const subscriptionData = await subscriptionResponse.json();

      // Check if user has PENDING_CHECKOUT status
      if (subscriptionData.status !== "PENDING_CHECKOUT") {
        toast.error("Please initiate upgrade from your dashboard first");
        router.push("/dashboard");
        return;
      }

      // Validate intended plan matches requested plan
      const intendedPlan = subscriptionData.intendedPlan;
      const expectedPlanId =
        intendedPlan === "professional"
          ? "professional-plan"
          : intendedPlan === "starter"
            ? "starter-plan"
            : intendedPlan === "free"
              ? "free-plan"
              : null;

      if (!expectedPlanId) {
        toast.error(`Invalid plan: ${intendedPlan}`);
        router.push("/dashboard");
        return;
      }

      if (planId !== expectedPlanId) {
        toast.error(
          `You can only checkout your intended plan: ${intendedPlan}`,
        );
        router.push(`/checkout?plan=${intendedPlan}`);
        return;
      }

      // If validation passes, fetch the plan details
      await fetchPlan();
    } catch (error) {
      console.error("Error validating user access:", error);
      toast.error("Unable to verify checkout permissions");
      router.push("/dashboard");
    }
  };

  const fetchPlan = async () => {
    try {
      const response = await fetch(`/api/subscription/plans`);
      if (!response.ok) throw new Error("Failed to fetch plans");

      const plans = await response.json();

      // Try to find plan by exact ID first
      let selectedPlan = plans.find((p: SubscriptionPlan) => p.id === planId);

      // If not found and planId doesn't end with '-plan', try adding '-plan' suffix
      if (!selectedPlan && planId && !planId.endsWith("-plan")) {
        const planIdWithSuffix = `${planId}-plan`;
        selectedPlan = plans.find(
          (p: SubscriptionPlan) => p.id === planIdWithSuffix,
        );
      }

      if (!selectedPlan) {
        toast.error("Subscription plan not found");
        router.push("/pricing");
        return;
      }

      setPlan(selectedPlan);
    } catch (error) {
      console.error("Error fetching plan:", error);
      toast.error("Failed to load subscription plan");
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

      // Check if Midtrans Snap is loaded
      if (!window.snap) {
        console.error("❌ Midtrans Snap not loaded");
        toast.error("Payment system not ready. Please refresh the page.");
        return;
      }

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
    } catch (error) {
      console.error("❌ Error creating payment:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">
                You don't have permission to checkout this plan. Please start
                the upgrade process from your dashboard.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => router.push("/dashboard")}
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
  const displayPrice = plan.price;
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
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
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
                  {plan.features.map((feature, index) => (
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
