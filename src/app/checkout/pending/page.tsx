"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const [checking, setChecking] = useState(false);

  // Optional: simple auto-redirect to dashboard after a short delay
  useEffect(() => {
    const t = setTimeout(() => {
      // Do not auto-redirect if user is interacting
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Payment Pending
            </CardTitle>
            <CardDescription>
              We are waiting for the payment to be completed. You can close this page and check your dashboard later.
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

            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for confirmation from the payment provider...
            </div>

            <div className="flex gap-2 pt-2">
              <Link href="/dashboard">
                <Button className="cursor-pointer">Go to Dashboard</Button>
              </Link>
              <Button
                variant="outline"
                className="cursor-pointer"
                disabled={checking}
                onClick={() => {
                  setChecking(true);
                  router.refresh();
                  setTimeout(() => setChecking(false), 600);
                }}
              >
                {checking ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking
                  </span>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
