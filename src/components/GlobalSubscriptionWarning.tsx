"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SubscriptionWarningToast from "./SubscriptionWarningToast";

export default function GlobalSubscriptionWarning() {
  const [show, setShow] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const pathname = usePathname();

  // Define the routes where the warning should appear
  const allowedRoutes = [
    "/dashboard",
    "/products",
    "/recipes",
    "/batches",
    "/ingredients",
    "/suppliers",
  ];

  // Check if current route should show the warning
  const shouldShowOnCurrentRoute = allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Debug logging in development only
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("GlobalSubscriptionWarning:", {
        pathname,
        shouldShowOnCurrentRoute,
        show,
        daysRemaining,
        isLoading,
      });
    }
  }, [pathname, shouldShowOnCurrentRoute, show, daysRemaining, isLoading]);

  useEffect(() => {
    // Reset state when not on allowed route
    if (!shouldShowOnCurrentRoute) {
      setShow(false);
      setIsLoading(false);
      setDebugInfo(null);
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchSubscriptionWarning = async () => {
      try {
        setIsLoading(true);

        // Add a small delay to ensure page is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 500));

        const res = await fetch("/api/subscription/warning", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (process.env.NODE_ENV === "development") {
          console.log("Subscription warning API response:", res.status, res.ok);
        }

        if (!res.ok) {
          if (process.env.NODE_ENV === "development") {
            console.log("API response not ok:", res.status, res.statusText);
          }
          return;
        }

        const data = await res.json();
        if (process.env.NODE_ENV === "development") {
          console.log("Subscription warning data:", data);
        }

        if (!mounted) return;

        setDebugInfo(data);
        setDaysRemaining(data?.daysRemaining || 0);

        if (data?.shouldWarn) {
          if (process.env.NODE_ENV === "development") {
            console.log("Setting show to true, shouldWarn:", data.shouldWarn);
          }
          // Add another small delay before showing to ensure smooth animation
          timeoutId = setTimeout(() => {
            if (mounted) {
              setShow(true);
            }
          }, 100);
        } else {
          if (process.env.NODE_ENV === "development") {
            console.log("Not showing warning, shouldWarn:", data.shouldWarn);
          }
          setShow(false);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching subscription warning:", error);
          setDebugInfo({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSubscriptionWarning();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [shouldShowOnCurrentRoute, pathname]);

  // Handle close
  const handleClose = () => {
    setShow(false);
  };

  // Don't render anything if we're not on an allowed route
  if (!shouldShowOnCurrentRoute) {
    return null;
  }

  // Show debug info in development
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <>
      {isDevelopment && debugInfo && (
        <div
          className="fixed bottom-4 left-4 z-[9998] bg-black text-white p-2 rounded text-xs max-w-xs"
          style={{ fontSize: "10px" }}
        >
          <div>Route: {pathname}</div>
          <div>Should show: {shouldShowOnCurrentRoute ? "Yes" : "No"}</div>
          <div>Loading: {isLoading ? "Yes" : "No"}</div>
          <div>Show toast: {show ? "Yes" : "No"}</div>
          <div>Days remaining: {daysRemaining}</div>
          <div>API data: {JSON.stringify(debugInfo, null, 2)}</div>
        </div>
      )}

      <SubscriptionWarningToast
        show={show}
        daysRemaining={daysRemaining}
        onClose={handleClose}
        message="Don't lose your data."
        ctaText="Renew Subscription"
        ctaLink="/subscription"
      />
    </>
  );
}
