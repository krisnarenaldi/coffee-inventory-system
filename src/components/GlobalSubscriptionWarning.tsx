"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SubscriptionWarningToast from "./SubscriptionWarningToast";

export default function GlobalSubscriptionWarning() {
  const [show, setShow] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [warningData, setWarningData] = useState<{
    message?: string;
    ctaText?: string;
    ctaLink?: string;
  }>({});
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        console.log("🚀 GlobalSubscriptionWarning: Starting check...");

        // Check if we're on the client side and fetch is available
        if (typeof window === "undefined" || typeof fetch === "undefined") {
          console.log(
            "❌ GlobalSubscriptionWarning: Window or fetch not available",
          );
          return;
        }

        console.log(
          "📡 GlobalSubscriptionWarning: Fetching /api/subscription/warning",
        );
        const res = await fetch("/api/subscription/warning");
        console.log(
          "📡 GlobalSubscriptionWarning: Response status:",
          res.status,
          res.statusText,
        );

        if (!res.ok) {
          console.log(
            "❌ GlobalSubscriptionWarning: Response not OK:",
            res.status,
          );
          return;
        }

        const data = await res.json();
        console.log("📊 GlobalSubscriptionWarning: API Response data:", data);

        if (!mounted) {
          console.log(
            "❌ GlobalSubscriptionWarning: Component unmounted, ignoring",
          );
          return;
        }

        const days = data?.daysRemaining || 0;
        setDaysRemaining(days);
        setWarningData({
          message: data?.message,
          ctaText: data?.ctaText,
          ctaLink: data?.ctaLink,
        });

        console.log(
          "🔍 GlobalSubscriptionWarning: shouldWarn?",
          data?.shouldWarn,
        );
        console.log("📝 GlobalSubscriptionWarning: message:", data?.message);
        console.log("📅 GlobalSubscriptionWarning: daysRemaining:", days);

        if (data?.shouldWarn) {
          console.log(
            "✅ GlobalSubscriptionWarning: Setting show=true, toast should appear!",
          );
          setShow(true);
        } else {
          console.log(
            "❌ GlobalSubscriptionWarning: shouldWarn is false, no toast",
          );
        }
      } catch (e) {
        console.error("❌ GlobalSubscriptionWarning: Error:", e);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const handleClose = () => {
    setShow(false);
  };

  // Suppress toast on /auth/* routes (e.g., /auth/signin, /auth/signup, etc)
  if (pathname && pathname.startsWith("/auth")) {
    return null;
  }

  console.log(
    "🎯 GlobalSubscriptionWarning: Rendering, show:",
    show,
    "pathname:",
    pathname,
  );

  return (
    <SubscriptionWarningToast
      show={show}
      daysRemaining={daysRemaining}
      onClose={handleClose}
      message={warningData.message || "Don't lose your data."}
      ctaText={warningData.ctaText || "Renew Subscription"}
      ctaLink={warningData.ctaLink || "/subscription"}
    />
  );
}
