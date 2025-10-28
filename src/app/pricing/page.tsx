"use client";

import { useState, useEffect } from "react";
import {
  Check,
  X,
  Star,
  Zap,
  Shield,
  Users,
  BarChart3,
  Clock,
  ChevronRight,
  Home,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations?: string[];
  popular?: boolean;
  buttonText: string;
  buttonVariant: "primary" | "secondary" | "outline";
  maxUsers?: number | null;
  maxIngredients?: number | null;
  maxBatches?: number | null;
  maxStorageLocations?: number | null;
  maxRecipes?: number | null;
  maxProducts?: number | null;
}

interface DatabasePlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  maxUsers: number | null;
  maxIngredients: number | null;
  maxBatches: number | null;
  maxStorageLocations: number | null;
  maxRecipes: number | null;
  maxProducts: number | null;
  features: any;
}

// Transform database plan to PricingTier format
const transformDatabasePlan = (plan: DatabasePlan): PricingTier => {
  const features = Array.isArray(plan.features) ? plan.features : [];
  const period = plan.interval === "MONTHLY" ? "/month" : "/year";

  // Add limit information to features
  const limitFeatures = [];
  if (plan.maxUsers !== null) {
    limitFeatures.push(`Up to ${plan.maxUsers} users`);
  }
  if (plan.maxIngredients !== null) {
    limitFeatures.push(`Up to ${plan.maxIngredients} ingredients`);
  }
  if (plan.maxBatches !== null) {
    limitFeatures.push(`Up to ${plan.maxBatches} batches`);
  }
  if (plan.maxStorageLocations !== null) {
    limitFeatures.push(`Up to ${plan.maxStorageLocations} storage locations`);
  }
  if (plan.maxRecipes !== null) {
    limitFeatures.push(`Up to ${plan.maxRecipes} recipes`);
  }
  if (plan.maxProducts !== null) {
    limitFeatures.push(`Up to ${plan.maxProducts} products`);
  }

  // Combine limit features with existing features
  const allFeatures = [...limitFeatures, ...features];

  // Determine if this is the most popular plan (you can adjust this logic)
  const popular =
    // plan.name.toLowerCase().includes("professional") ||
    // plan.name.toLowerCase().includes("pro");
    plan.name.toLowerCase().includes("starter") ||
    plan.name.toLowerCase().includes("start");

  return {
    name: plan.name,
    price: `${plan.price}`,
    period,
    description: plan.description || `${plan.name} subscription plan`,
    features: allFeatures,
    buttonText: "Sign up",
    buttonVariant: popular ? "primary" : "outline",
    popular,
    maxUsers: plan.maxUsers,
    maxIngredients: plan.maxIngredients,
    maxBatches: plan.maxBatches,
    maxStorageLocations: plan.maxStorageLocations,
    maxRecipes: plan.maxRecipes,
    maxProducts: plan.maxProducts,
  };
};

const features = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Get deep insights into your brewery operations with comprehensive reporting and analytics.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-level security with encryption, regular backups, and compliance certifications.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Work seamlessly with your team with role-based permissions and real-time updates.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description:
      "Get help when you need it with our dedicated support team and comprehensive documentation.",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch subscription plans from database
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/pricing/plans");
        if (response.ok) {
          const plans: DatabasePlan[] = await response.json();
          const transformedTiers = plans.map(transformDatabasePlan);
          setPricingTiers(transformedTiers);
        } else {
          console.error("Failed to fetch plans");
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-600 text-lg">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-amber-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <Link
                  href="/"
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
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
                </Link>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/#features"
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
              <Link
                href="/auth/signin"
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Page Title Section */}
      {/* <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white py-16"> */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-5">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-amber-600 text-lg">
          Select the perfect plan for your brewing's needs
        </p>
      </div>
      {/*</div> */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Billing Toggle */}
        {/*
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-amber-200/20">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md"
                  : "text-gray-600 hover:text-amber-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all relative ${
                billingCycle === "yearly"
                  ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md"
                  : "text-gray-600 hover:text-amber-700"
              }`}
            >
              Yearly
          
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
          
            </button>
          </div>
        </div>
        */}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier, index) => {
            const yearlyPrice =
              billingCycle === "yearly"
                ? Math.round(parseInt(tier.price.replace("Rp", "")) * 0.8)
                : parseInt(tier.price.replace("Rp", ""));

            return (
              <div
                key={tier.name}
                className={`relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border transition-all duration-300 hover:shadow-2xl hover:scale-105 ${tier.popular
                  ? "border-amber-300 ring-2 ring-amber-200"
                  : "border-amber-200/20 hover:border-amber-300"
                  }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                      {tier.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        Rp
                        {yearlyPrice.toLocaleString("id-ID", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-gray-600">{tier.period}</span>
                      {billingCycle === "yearly" && (
                        <div className="text-sm text-green-600 font-medium">
                          Save Rp
                          {(
                            parseInt(
                              tier.price.replace("Rp", "").replace(/\./g, ""),
                            ) *
                            12 -
                            yearlyPrice * 12
                          ).toLocaleString("id-ID", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                          /year
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600">{tier.description}</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {tier.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="flex items-start space-x-3"
                      >
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {tier.limitations?.map((limitation, limitIndex) => (
                      <div
                        key={limitIndex}
                        className="flex items-start space-x-3"
                      >
                        <X className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-500">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/auth/signup?plan=${tier.name
                      .toLowerCase()
                      .replace(/\s+/g, "-")}&cycle=${billingCycle}`}
                    className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 block text-center ${tier.buttonVariant === "primary"
                      ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 shadow-lg hover:shadow-xl"
                      : tier.buttonVariant === "secondary"
                        ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
                        : "border-2 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white"
                      }`}
                  >
                    {tier.buttonText}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Why Choose Our Platform?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Built specifically for breweries, our platform provides everything
            you need to manage your operations efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-amber-200/20 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/20 p-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                take effect immediately.
              </p>

              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Yes, we offer a 14-day free trial for all plans. No credit card
                required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                We accept all major credit cards, PayPal, and bank transfers for
                annual plans.
              </p>

              <h3 className="font-semibold text-gray-900 mb-2">
                Do you offer custom plans?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Yes, we can create custom plans for large breweries with
                specific requirements.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-amber-100 mb-6 max-w-2xl mx-auto">
              Join hundreds of breweries already using our platform to
              streamline their operations and grow their business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-white text-amber-600 px-8 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Sign up
              </Link>
              {/* <button className="border-2 border-white text-white px-8 py-3 rounded-xl font-medium hover:bg-white hover:text-amber-600 transition-colors cursor-pointer">
                Schedule Demo
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-10">
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
                  <Link
                    href="/auth/signin"
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    Sign In
                  </Link>
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
