"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  canManageInventory,
  canManageProducts,
  canViewReports,
  canManagePackagingTypes,
  canManageUsers,
} from "../../lib/auth";

interface NavigationProps {
  title?: string;
  subtitle?: string;
}

export default function Navigation({ title, subtitle }: NavigationProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasAdvancedAnalytics, setHasAdvancedAnalytics] = useState(false);
  const [hasBasicReports, setHasBasicReports] = useState(false);

  // Check subscription features
  useEffect(() => {
    const checkSubscriptionFeatures = async () => {
      if (!session?.user?.tenantId) return;

      try {
        // Check for advanced analytics
        const advancedResponse = await fetch(
          "/api/subscription/features?feature=advancedReports"
        );
        const advancedData = await advancedResponse.json();
        console.log("🔍 NAVIGATION: Advanced analytics check:", advancedData);
        setHasAdvancedAnalytics(advancedData.hasAccess || false);

        // Check for basic reports
        const basicResponse = await fetch(
          "/api/subscription/features?feature=basicReports"
        );
        const basicData = await basicResponse.json();
        console.log("🔍 NAVIGATION: Basic reports check:", basicData);
        setHasBasicReports(basicData.hasAccess || false);
      } catch (error) {
        console.error("Error checking subscription features:", error);
      }
    };

    if (session?.user?.tenantId) {
      checkSubscriptionFeatures();
    }
  }, [session?.user?.tenantId]);

  // Prevent hydration mismatch by not rendering until session is loaded
  if (status === "loading") {
    return (
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="text-xl font-bold text-gray-900">
                ☕ Coffee Shop Inventory
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const userRole = session?.user?.role;

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "🏠",
      permission: () => true,
    },
    {
      name: "Coffee Products",
      href: "/products",
      icon: "🛍️",
      permission: () => (userRole ? canManageProducts(userRole) : false),
    },

    {
      name: "Roast Profiles",
      href: "/recipes",
      icon: "📋",
      permission: () => (userRole ? canManageInventory(userRole) : false),
    },
    {
      name: "Roast Batches",
      href: "/batches",
      icon: "☕",
      permission: () => (userRole ? canManageInventory(userRole) : false),
    },
    {
      name: "Ingredients",
      href: "/ingredients",
      icon: "📦",
      permission: () => (userRole ? canManageInventory(userRole) : false),
    },
    {
      name: "Suppliers",
      href: "/suppliers",
      icon: "🏢",
      permission: () => (userRole ? canManageInventory(userRole) : false),
    },
    {
      name: "Packaging Types",
      href: "/packaging-types",
      icon: "📦",
      permission: () => (userRole ? canManagePackagingTypes(userRole) : false),
    },
    {
      name: "Storage Locations",
      href: "/storage-locations",
      icon: "📍",
      permission: () => (userRole ? canManageInventory(userRole) : false),
    },
    { name: "Alerts", href: "/alerts", icon: "🚨", permission: () => true },
    {
      name: "Schedules",
      href: "/schedules",
      icon: "📅",
      permission: () => (userRole ? canManageInventory(userRole) : false),
    },
    {
      name: hasAdvancedAnalytics ? "Analytics" : "Analytics (Basic)",
      href: "/analytics",
      icon: "📊",
      permission: () =>
        userRole
          ? canViewReports(userRole) &&
            (hasBasicReports || hasAdvancedAnalytics)
          : false,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: "📋",
      permission: () => (userRole ? canViewReports(userRole) : false),
    },
    {
      name: "Users",
      href: "/users",
      icon: "👥",
      permission: () => (userRole ? canManageUsers(userRole) : false),
    },
    {
      name: "Help",
      href: "/help",
      icon: "❓",
      permission: () => true,
    },
  ];

  // Filter navigation items based on user permissions
  const filteredNavigationItems = navigationItems.filter((item) => {
    const hasPermission = item.permission();
    if (item.name.includes("Analytics")) {
      console.log("🔍 NAVIGATION: Analytics permission check:", {
        itemName: item.name,
        hasPermission,
        userRole,
        canViewReports: userRole ? canViewReports(userRole) : false,
        hasBasicReports,
        hasAdvancedAnalytics,
      });
    }
    return hasPermission;
  });

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation Items */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <Image
                  src="/logo-polos.png"
                  alt="Coffee Shop Inventory Logo"
                  width={60}
                  height={60}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-gray-900">
                  Coffee Shop Inventory
                </span>
              </Link>
            </div>

            {/* Desktop Navigation - Primary Items */}
            <div className="hidden xl:ml-4 xl:flex xl:space-x-2">
              {filteredNavigationItems.slice(0, 6).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-2 pt-1 border-b-2 text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                    isActive(item.href)
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  <span className="mr-1 text-sm">{item.icon}</span>
                  <span className="hidden 2xl:inline">{item.name}</span>
                  <span className="xl:inline 2xl:hidden">
                    {item.name === "Roast Profiles"
                      ? "Recipes"
                      : item.name === "Roast Batches"
                      ? "Batches"
                      : item.name === "Coffee Products"
                      ? "Products"
                      : item.name.split(" ")[0]}
                  </span>
                </Link>
              ))}

              {/* More Menu Dropdown */}
              <div className="relative group">
                <button className="inline-flex items-center px-2 pt-1 border-b-2 border-transparent text-xs font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors duration-200 whitespace-nowrap h-16 cursor-pointer">
                  <span className="mr-1 text-sm">⋯</span>
                  <span>More</span>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    {filteredNavigationItems.slice(6).map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-2 text-sm transition-colors duration-200 ${
                          isActive(item.href)
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden xl:ml-6 xl:flex xl:items-center space-x-3">
            {/* Upgrade CTA for free users */}
            {!hasBasicReports && (
              <Link
                href="/subscription?src=nav"
                className="inline-flex items-center px-3 py-1 border border-amber-300 text-amber-700 bg-white rounded-md text-sm font-medium hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <span className="mr-1">🚀</span>
                Upgrade
              </Link>
            )}
            {/* User Info */}
            <div className="text-xs text-gray-700 whitespace-nowrap">
              <span className="hidden 2xl:inline">Welcome, </span>
              <span className="font-medium">{session?.user?.name}</span>
            </div>

            {/* User Actions Dropdown */}
            <div className="relative group">
              <button className="flex items-center text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer">
                <span className="mr-1">👤</span>
                <span className="hidden 2xl:inline">Account</span>
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="mr-2">👤</span>
                    Profile
                  </Link>

                  {/* Users Link */}
                  {["ADMIN"].includes(session?.user?.role || "") && (
                    <Link
                      href="/users"
                      className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <span className="mr-2">👥</span>
                      Users
                    </Link>
                  )}

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <span className="mr-2">🚪</span>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={`${isMobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isMobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMobileMenuOpen ? "block" : "hidden"} xl:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {filteredNavigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 ${
                isActive(item.href)
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>

        {/* Mobile user menu */}
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <div className="text-base font-medium text-gray-800">
              {session?.user?.name}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {!hasBasicReports && (
              <Link
                href="/subscription?src=nav_mobile"
                className="block mx-4 mb-2 px-4 py-2 text-base font-medium text-amber-700 border border-amber-200 rounded-md bg-white hover:bg-amber-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">🚀</span>
                Upgrade
              </Link>
            )}
            <Link
              href="/profile"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Profile
            </Link>
            {["ADMIN"].includes(session?.user?.role || "") && (
              <Link
                href="/users"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Users
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Page Title Section */}
      {(title || subtitle) && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {title && (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )}
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
        </div>
      )}
    </nav>
  );
}
