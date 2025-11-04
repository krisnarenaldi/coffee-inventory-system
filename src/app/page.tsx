"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function Home() {
  const { status } = useSession();
  useEffect(() => {
    // Add smooth scroll behavior for anchor links
    const handleSmoothScroll = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.hash && target.hash === "#features") {
        e.preventDefault();
        const featuresSection = document.getElementById("features");
        if (featuresSection) {
          // Add slide-down animation class
          featuresSection.classList.remove("animate-slide-down");
          void featuresSection.offsetWidth; // Trigger reflow
          featuresSection.classList.add("animate-slide-down");

          // Scroll to the section
          featuresSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          // Animate feature cards with staggered delay
          setTimeout(() => {
            const featureCards =
              featuresSection.querySelectorAll(".feature-card");
            featureCards.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add("animate-slide-down");
              }, index * 150);
            });
          }, 300);
        }
      }
    };

    // Add event listeners to all anchor links
    const anchorLinks = document.querySelectorAll('a[href="#features"]');
    anchorLinks.forEach((link) => {
      link.addEventListener("click", handleSmoothScroll);
    });

    // Cleanup event listeners
    return () => {
      anchorLinks.forEach((link) => {
        link.removeEventListener("click", handleSmoothScroll);
      });
    };
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-amber-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <Image
                  src="/logo-polos.png"
                  alt="BreweryOS Logo"
                  width={60}
                  height={60}
                  className="rounded-lg"
                />
                <div className="text-2xl font-thin text-amber-600 dark:text-amber-400 font-[var(--font-josefin-sans)]">
                  Coffee Logica
                </div>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-gray-600 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400 py-2"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-gray-600 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400 py-2"
              >
                Pricing
              </Link>
              <Link
                href="/help"
                className="text-gray-600 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400 py-2"
              >
                Docs
              </Link>
              {status !== "authenticated" ? (
                <Link
                  href="/auth/signin"
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Sign In
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Dashboard
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Coffee Inventory
            <span className="text-amber-600 dark:text-amber-400">
              {" "}
              Management
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Comprehensive SaaS solution for craft breweries to track and manage
            inventory from raw materials to finished products. Reduce waste,
            optimize stock levels, and gain valuable insights into your brewing
            operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup?plan=free"
              className="bg-amber-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo"
              className="border border-amber-600 text-amber-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-32 scroll-mt-20 animate-fade-in">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Everything You Need to Manage Your Brewery
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-3xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Inventory Tracking
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track raw materials, ingredients, and finished products with
                real-time updates and low stock alerts.
              </p>
            </div>
            <div className="feature-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-3xl mb-4">☕️</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Batch Management
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor production batches from start to finish with detailed
                tracking and quality control.
              </p>
            </div>
            <div className="feature-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Analytics & Reports
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Generate comprehensive reports on inventory valuation, yield
                efficiency, and waste tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mt-32 bg-white dark:bg-gray-800 rounded-2xl p-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                90%
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Reduction in stockouts
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                75%
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Time saved on inventory counts
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                98%
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Inventory accuracy achieved
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl font-thin text-amber-400 font-[var(--font-josefin-sans)]">
                  Coffee Logica
                </div>
              </div>
              <p className="text-gray-400 max-w-md">
                Comprehensive SaaS solution for coffee shops and breweries to
                manage inventory from raw materials to finished products.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/pitch"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Pitch
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  {status !== "authenticated" && (
                    <Link
                      href="/auth/signin"
                      className="text-gray-400 hover:text-amber-400 transition-colors"
                    >
                      Sign In
                    </Link>
                  )}
                </li>
                <li>
                  <Link
                    href="/auth/signup"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Support */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Legal & Support
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/terms"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-400 text-sm">
                © 2024 Coffee Logica. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-amber-400 text-sm transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-amber-400 text-sm transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-amber-400 text-sm transition-colors"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
