"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { checkFeatureAccess } from "../../lib/subscription-client";
import UpgradeMessage from "./UpgradeMessage";

interface SubscriptionProtectedPageProps {
  children: React.ReactNode;
  requiredFeature: string;
  featureName: string;
  requiredPlan?: string;
  description?: string;
  fallbackPath?: string;
}

export default function SubscriptionProtectedPage({
  children,
  requiredFeature,
  featureName,
  requiredPlan = "Starter",
  description,
  fallbackPath = "/dashboard",
}: SubscriptionProtectedPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (status === "loading") return;

      if (!session) {
        router.push("/auth/signin");
        return;
      }

      if (!session.user?.tenantId) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      try {
        const access = await checkFeatureAccess(requiredFeature);
        setHasAccess(access);
      } catch (error) {
        console.error("Failed to check feature access:", error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [session, status, router, requiredFeature]);

  // Show loading spinner while checking access
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect to signin if no session
  if (!session) {
    return null;
  }

  // Show upgrade message if no access
  if (hasAccess === false) {
    return (
      <UpgradeMessage
        feature={featureName}
        requiredPlan={requiredPlan}
        description={description}
      />
    );
  }

  // Render children if access is granted
  return <>{children}</>;
}