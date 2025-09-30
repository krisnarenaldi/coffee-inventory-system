"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ErrorContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Payment Failed or Cancelled
            </CardTitle>
            <CardDescription>
              Your payment did not complete. You can try again.
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
            <div className="flex gap-2 pt-2">
              <Link href="/dashboard">
                <Button className="cursor-pointer">Back to Dashboard</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="cursor-pointer">Choose Plan</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
