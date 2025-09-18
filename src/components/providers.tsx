'use client';

import { SessionProvider } from 'next-auth/react';

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
      {children}
    </SessionProvider>
  );
}