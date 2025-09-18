"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

interface UpgradeMessageProps {
  feature: string;
  requiredPlan?: string;
  description?: string;
}

export default function UpgradeMessage({ 
  feature, 
  requiredPlan = "Starter", 
  description 
}: UpgradeMessageProps) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Upgrade Required
            </h2>

            {/* Message */}
            <p className="mt-2 text-sm text-gray-600">
              {description || `The ${feature} feature is only available for ${requiredPlan} plan and above.`}
            </p>

            {/* Current Plan Info */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500">
                Current Plan: <span className="font-medium text-gray-900">Free</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <Link
                href="/pricing"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                View Pricing Plans
              </Link>
              
              <Link
                href="/dashboard"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>

            {/* Features List */}
            <div className="mt-6 text-left">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {requiredPlan} Plan includes:
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                {requiredPlan === "Starter" && (
                  <>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Basic Reports
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Up to 5 users
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Up to 100 ingredients
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Email Support
                    </li>
                  </>
                )}
                {requiredPlan === "Professional" && (
                  <>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Advanced Analytics
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Advanced Reports
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Up to 20 users
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Phone Support
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}