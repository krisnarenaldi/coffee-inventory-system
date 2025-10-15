"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface SubscriptionWarningToastProps {
  show: boolean;
  daysRemaining: number;
  onClose: () => void;
  message?: string;
  ctaText?: string;
  ctaLink?: string;
}

export default function SubscriptionWarningToast({
  show,
  daysRemaining,
  onClose,
  message,
  ctaText,
  ctaLink,
}: SubscriptionWarningToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
      setTimeout(() => {
        setIsVisible(true);
      }, 10);

      // Start countdown from 5 seconds
      setCountdown(5);

      // Auto-close after 5 seconds for better UX
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      setAutoCloseTimer(timer);

      // Countdown timer
      let countdownValue = 5;
      const countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
          setCountdown(countdownValue);
        } else {
          clearInterval(countdownInterval);
        }
      }, 1000);
    } else {
      setIsVisible(false);
      // Clear auto-close timer if manually closed
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
      // Wait for animation to complete before removing from DOM
      setTimeout(() => {
        setShouldRender(false);
      }, 300);
    }

    // Cleanup timer on unmount
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [show]);

  const handleClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  // Don't render if not needed
  if (!shouldRender) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-md w-full transition-all duration-300 ease-in-out transform ${
        isVisible
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-full opacity-0 scale-95"
      }`}
      style={{
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg shadow-lg p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                <svg
                  className="h-5 w-5 text-yellow-600"
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
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-yellow-900">
                {message
                  ? "Subscription Reminder"
                  : "Subscription Expiring Soon"}
              </h3>
              <div className="mt-1 text-sm text-yellow-800">
                {message ? (
                  <p>
                    {message}{" "}
                    <a
                      href={ctaLink || "/subscription"}
                      className="underline text-yellow-900 hover:text-yellow-700 font-medium transition-colors duration-200"
                    >
                      Renew now
                    </a>
                    .
                  </p>
                ) : (
                  <p>
                    Your subscription will end in{" "}
                    <span className="font-bold text-red-600">
                      {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
                    </span>
                    . Please renew to continue using this service.
                  </p>
                )}
              </div>
              <div className="mt-3">
                <a
                  href={ctaLink || "/subscription"}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  {ctaText || "Renew Subscription"}
                </a>
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              className="inline-flex text-yellow-500 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 rounded-md p-1 transition-all duration-200 hover:bg-yellow-100"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress bar showing days remaining */}
        {daysRemaining > 0 && daysRemaining <= 30 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-yellow-700 mb-1">
              <span>Grace period</span>
              <span>{daysRemaining} days left</span>
            </div>
            <div className="w-full bg-yellow-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  daysRemaining > 7
                    ? "bg-yellow-400"
                    : daysRemaining > 3
                      ? "bg-orange-400"
                      : "bg-red-500"
                }`}
                style={{
                  width: `${Math.max((daysRemaining / 30) * 100, 5)}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Auto-close countdown indicator */}
        <div className="mt-2 text-xs text-yellow-600 opacity-75 flex items-center space-x-2">
          <span>Auto-closes in</span>
          <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-200 text-yellow-800 rounded-full font-bold text-xs animate-pulse">
            {countdown}
          </span>
          <span>seconds</span>
        </div>
      </div>
    </div>
  );
}
