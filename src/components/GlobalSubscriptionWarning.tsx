"use client";

import { useEffect, useState } from "react";
import SubscriptionWarningToast from "./SubscriptionWarningToast";

export default function GlobalSubscriptionWarning() {
  const [show, setShow] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await fetch("/api/subscription/warning");
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setDaysRemaining(data?.daysRemaining || 0);
        if (data?.shouldWarn) {
          setShow(true);
        }
      } catch (e) {
        // Ignore errors silently
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SubscriptionWarningToast
      show={show}
      daysRemaining={daysRemaining}
      onClose={() => setShow(false)}
      // Keep message concise to avoid duplicate CTA text
      message={"Don't lose your data."}
      ctaText={"Renew Subscription"}
      ctaLink={"/subscription"}
    />
  );
}
