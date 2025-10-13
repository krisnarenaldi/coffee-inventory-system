"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  allowedRoutes?: string[]; // Routes that should be accessible even with expired subscription
}

/**
 * Global subscription guard that checks if user's subscription is expired
 * and redirects to renewal page if needed. This should wrap all protected content.
 */
export default function SubscriptionGuard({
  children,
  allowedRoutes = ["/subscription", "/auth", "/profile", "/help", "/contact"],
}: SubscriptionGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (status === "loading") return;

      // Allow unauthenticated users to pass through (auth will handle them)
      if (status === "unauthenticated") {
        setIsChecking(false);
        return;
      }

      if (!session?.user) {
        setIsChecking(false);
        return;
      }

      // Debug logging
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      console.log(
        "🛡️ SUBSCRIPTION GUARD: Checking subscription for path:",
        currentPath
      );
      console.log(
        "🛡️ User:",
        session.user.email,
        "Tenant:",
        session.user.tenantId
      );
      console.log(
        "🛡️ Subscription expired flag:",
        session.user.subscriptionExpired
      );

      // Check if current route is allowed even with expired subscription
      const isAllowedRoute = allowedRoutes.some((route) =>
        currentPath.startsWith(route)
      );

      if (isAllowedRoute) {
        setIsChecking(false);
        return;
      }

      // ALWAYS do server-side check for subscription status
      // Don't rely only on session flag as it may be stale
      try {
        const response = await fetch("/api/subscription/status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();

          // If subscription is expired on server, redirect immediately
          if (!data.isActive) {
            console.log(
              "🚨 SUBSCRIPTION GUARD: Server reports expired subscription, redirecting to renewal"
            );
            console.log("🚨 Current path:", currentPath);
            console.log(
              "🚨 User:",
              session.user.email,
              "Tenant:",
              session.user.tenantId
            );
            console.log("🚨 Server data:", data);

            // Force session refresh by signing out and back in to update the session flag
            if (!session.user.subscriptionExpired) {
              console.log("🚨 Session flag is stale, forcing session refresh");
              window.location.href =
                "/auth/signin?callbackUrl=" +
                encodeURIComponent("/subscription?expired=true");
              return;
            }

            router.push("/subscription?expired=true");
            return;
          } else {
            // Subscription is active on server
            // Check if session flag is stale (session says expired, but server says active)
            if (session.user.subscriptionExpired) {
              console.log(
                "🎉 SUBSCRIPTION GUARD: Subscription renewed! Session flag is stale (session: expired, server: active), forcing session refresh"
              );
              console.log("🎉 Current path:", currentPath);
              console.log(
                "🎉 User:",
                session.user.email,
                "Tenant:",
                session.user.tenantId
              );
              console.log("🎉 Server data:", data);

              // Force session refresh to update the subscriptionExpired flag
              window.location.href =
                "/auth/signin?callbackUrl=" + encodeURIComponent(currentPath);
              return;
            }
          }
        } else if (response.status === 401) {
          // Unauthorized - redirect to signin
          console.log(
            "🚨 SUBSCRIPTION GUARD: Unauthorized, redirecting to signin"
          );
          router.push(
            "/auth/signin?callbackUrl=" + encodeURIComponent(currentPath)
          );
          return;
        } else {
          console.warn("Failed to check subscription status:", response.status);
        }
      } catch (error) {
        console.error("Error checking subscription status:", error);
        // On error, be conservative and redirect to renewal if we suspect expiration
        console.log(
          "🚨 SUBSCRIPTION GUARD: Error occurred, being conservative and redirecting"
        );
        router.push("/subscription?expired=true");
        return;
      }

      setIsChecking(false);
    };

    checkSubscription();
  }, [session, status, router, allowedRoutes]);

  // Show loading while checking subscription
  if (status === "loading" || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Allow unauthenticated users to pass through (auth pages will handle them)
  if (status === "unauthenticated") {
    return <>{children}</>;
  }

  // Check if current route is allowed even with expired subscription
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isAllowedRoute = allowedRoutes.some((route) =>
    currentPath.startsWith(route)
  );

  // If subscription is expired and not on allowed route, don't render children
  if (session?.user?.subscriptionExpired && !isAllowedRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Redirecting to subscription renewal...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
