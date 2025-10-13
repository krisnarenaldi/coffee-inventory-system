"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  useEffect(() => {
    async function reconcile() {
      if (!orderId) return;
      try {
        setReconciling(true);
        setReconcileError(null);
        const res = await fetch("/api/checkout/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to reconcile order status");
        }
        // No UI change needed; dashboard will reflect status on next load
      } catch (e: any) {
        console.error("Reconcile error:", e);
        setReconcileError(e.message || "Unable to reconcile order");
      } finally {
        setReconciling(false);
      }
    }
    reconcile();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Payment Successful
            </CardTitle>
            <CardDescription>
              Thank you! Your subscription will be activated shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              {orderId ? (
                <>
                  <div>Order ID:</div>
                  <div className="font-mono text-gray-800">{orderId}</div>
                </>
              ) : (
                <div>No order reference provided.</div>
              )}
            </div>
            {reconciling && (
              <div className="text-xs text-gray-500">
                Reconciling payment status...
              </div>
            )}
            {reconcileError && (
              <div className="text-xs text-red-600">{reconcileError}</div>
            )}
            <div className="pt-2">
              <Button
                className="cursor-pointer"
                onClick={() => {
                  // Force session refresh after successful payment to update subscriptionExpired flag
                  window.location.href =
                    "/auth/signin?callbackUrl=" +
                    encodeURIComponent("/dashboard");
                }}
              >
                Continue to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
