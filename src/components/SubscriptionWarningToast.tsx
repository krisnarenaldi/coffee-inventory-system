"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface SubscriptionWarningToastProps {
  show: boolean;
  daysRemaining: number;
  onClose: () => void;
  message?: string;
  ctaText?: string;
  ctaLink?: string;
  autoCloseMs?: number;
}

export default function SubscriptionWarningToast({
  show,
  daysRemaining,
  onClose,
  message,
  ctaText,
  ctaLink,
  autoCloseMs = 6000,
}: SubscriptionWarningToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Use a ref to hold the auto-close timer so re-renders won't reset it
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("🎨 SubscriptionWarningToast: useEffect triggered");
    console.log("🎨 Props:", {
      show,
      daysRemaining,
      message,
      ctaText,
      ctaLink,
    });

    if (!show) {
      // If not showing, ensure visibility is off and clear any existing timer
      console.log("🎨 SubscriptionWarningToast: show=false, hiding");
      setIsVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // show is true
    console.log("🎨 SubscriptionWarningToast: show=true, making visible");
    setIsVisible(true);

    // If a timer already exists, don't recreate it (prevents dashboards with frequent re-renders
    // from continuously restarting the timer)
    if (timerRef.current) return;

    timerRef.current = window.setTimeout(
      () => {
        // Clear the ref first to avoid double-clear
        timerRef.current = null;
        handleClose();
      },
      Math.max(0, autoCloseMs),
    );

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [show, autoCloseMs]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  if (!show && !isVisible) {
    console.log("🎨 SubscriptionWarningToast: Returning null - not showing");
    return null;
  }

  console.log(
    "🎨 SubscriptionWarningToast: Rendering toast UI - show:",
    show,
    "isVisible:",
    isVisible,
  );

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md w-full transition-all duration-300 ease-in-out transform ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {message
                  ? "Subscription Reminder"
                  : "Subscription Expiring Soon"}
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                {message ? (
                  <p>{message}</p>
                ) : (
                  <p>
                    Your subscription will end in{" "}
                    <span className="font-semibold">
                      {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
                    </span>
                    . Please renew to continue using this service.
                  </p>
                )}
              </div>
              <div className="mt-3">
                <a
                  href={ctaLink || "/subscription"}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                >
                  {ctaText || "Renew Subscription"}
                </a>
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              className="inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 rounded-md p-1 transition-colors duration-200"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
