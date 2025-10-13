"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  canManageInventory,
  canManageProducts,
  canViewReports,
  canManagePackagingTypes,
  UserRole,
} from "../../lib/auth";

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredPermission:
    | "inventory"
    | "products"
    | "reports"
    | "admin"
    | "packaging-types";
  fallbackPath?: string;
}

export default function ProtectedPage({
  children,
  requiredPermission,
  fallbackPath = "/dashboard",
}: ProtectedPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkProtection = async () => {
      if (status === "loading") return; // Still loading

      if (!session) {
        router.push("/auth/signin");
        return;
      }

      // Authoritative server-side check for subscription status
      try {
        const response = await fetch("/api/subscription/status");
        if (response.ok) {
          const data = await response.json();
          if (data.isExpired === true || data.isActive === false) {
            console.log(
              "🛡️ PROTECTED PAGE: Server reports expired subscription, redirecting"
            );
            router.push("/subscription?expired=true");
            return;
          }
        }
      } catch (error) {
        console.error(
          "ProtectedPage: Error checking subscription status:",
          error
        );
        // Continue with permission check - don't block on API errors
      }
      const userRole = session.user?.role as UserRole;
      let hasPermission = false;

      switch (requiredPermission) {
        case "inventory":
          hasPermission = userRole ? canManageInventory(userRole) : false;
          break;
        case "products":
          hasPermission = userRole ? canManageProducts(userRole) : false;
          break;
        case "reports":
          hasPermission = userRole ? canViewReports(userRole) : false;
          break;
        case "packaging-types":
          hasPermission = userRole ? canManagePackagingTypes(userRole) : false;
          break;
        case "admin":
          hasPermission = userRole === "PLATFORM_ADMIN";
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        router.push(fallbackPath);
        return;
      }
    };

    checkProtection();
  }, [session, status, router, requiredPermission, fallbackPath]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  // Note: subscription expiration is validated via server API in effect

  const userRole = session.user?.role as UserRole;
  let hasPermission = false;

  switch (requiredPermission) {
    case "inventory":
      hasPermission = userRole ? canManageInventory(userRole) : false;
      break;
    case "products":
      hasPermission = userRole ? canManageProducts(userRole) : false;
      break;
    case "reports":
      hasPermission = userRole ? canViewReports(userRole) : false;
      break;
    case "packaging-types":
      hasPermission = userRole ? canManagePackagingTypes(userRole) : false;
      break;
    case "admin":
      hasPermission = userRole === "PLATFORM_ADMIN";
      break;
    default:
      hasPermission = false;
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.push(fallbackPath)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
