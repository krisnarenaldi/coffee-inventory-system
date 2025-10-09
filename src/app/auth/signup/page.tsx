"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  breweryName: string;
  subdomain: string;
}

function SignUpContent() {
  const [formData, setFormData] = useState<SignUpFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    breweryName: "",
    subdomain: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get plan from query parameters
  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan) {
      setSelectedPlan(plan);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate subdomain from brewery name
    if (name === "breweryName") {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({
        ...prev,
        subdomain,
      }));
    }
  };

  const validateForm = () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.breweryName ||
      !formData.subdomain
    ) {
      setError("All fields are required");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
      setError(
        "Subdomain can only contain lowercase letters, numbers, and hyphens"
      );
      return false;
    }

    if (formData.subdomain.length < 3) {
      setError("Subdomain must be at least 3 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          breweryName: formData.breweryName,
          subdomain: formData.subdomain,
          plan: selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);

      // Handle different plan flows
      if (data.requiresCheckout) {
        // For paid plans, first sign in the newly registered user, then redirect to checkout
        const planId = selectedPlan ? `${selectedPlan}-plan` : "starter-plan";
        try {
          const signinResult = await signIn("credentials", {
            redirect: false,
            email: formData.email,
            password: formData.password,
            tenantSubdomain: formData.subdomain,
          });

          if (signinResult?.error) {
            // If auto sign-in fails, fall back to sign-in page
            router.push(
              `/auth/signin?message=Registration successful. Please sign in to continue checkout.&email=${encodeURIComponent(
                formData.email
              )}`
            );
            return;
          }

          router.push(`/checkout?plan=${planId}&cycle=monthly`);
        } catch (e) {
          // Fallback in case signIn throws
          router.push(
            `/auth/signin?message=Registration successful. Please sign in to continue checkout.&email=${encodeURIComponent(
              formData.email
            )}`
          );
        }
      } else {
        // For free plan, redirect to sign-in page
        setTimeout(() => {
          router.push(
            "/auth/signin?message=Registration successful. Please sign in."
          );
        }, 2000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Registration Successful!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your brewery account has been created. Please do not close the
              browser. Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      {/* Logo in upper left corner */}
      <div className="absolute top-6 left-6 flex items-center space-x-3">
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
          <div className="text-xl font-thin text-amber-600 font-[var(--font-josefin-sans)]">
            Coffee Logica
          </div>
        </Link>
      </div>

      {/* Centered form */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create your brewery account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="font-medium text-amber-600 hover:text-amber-500"
              >
                Sign in
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  style={{ backgroundColor: "#fef6e9" }}
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  style={{ backgroundColor: "#fef6e9" }}
                  placeholder="john@coffeelogica.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="breweryName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Brewery Name
                </label>
                <input
                  id="breweryName"
                  name="breweryName"
                  type="text"
                  maxLength={20}
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  style={{ backgroundColor: "#fef6e9" }}
                  placeholder="Craft Brewery Co."
                  value={formData.breweryName}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-500">Max 20 characters.</p>
              </div>

              <div>
                <label
                  htmlFor="subdomain"
                  className="block text-sm font-medium text-gray-700"
                >
                  Subdomain
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    id="subdomain"
                    name="subdomain"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-l-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                    style={{ backgroundColor: "#fef6e9" }}
                    placeholder="craft-brewery"
                    value={formData.subdomain}
                    onChange={handleChange}
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    .coffeelogica.com
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This will be your brewery's unique URL
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  style={{ backgroundColor: "#fef6e9" }}
                  placeholder="Password (min. 8 characters)"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  style={{ backgroundColor: "#fef6e9" }}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="text-amber-600 hover:text-amber-500"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-amber-600 hover:text-amber-500"
              >
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignUp() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
