"use client";

import { SessionProvider } from "next-auth/react";
import SubscriptionGuard from "./SubscriptionGuard";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      refetchInterval={30 * 60} // Refetch session every 30 minutes (less aggressive)
      refetchOnWindowFocus={false} // Disable refetch on window focus to prevent session conflicts
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <SubscriptionGuard
        allowedRoutes={[
          "/subscription",
          "/auth",
          "/profile",
          "/help",
          "/contact",
          "/pricing",
          "/privacy",
          "/terms",
          "/", // Landing page
          "/api", // API routes
        ]}
      >
        {children}
      </SubscriptionGuard>
    </SessionProvider>
  );
}
