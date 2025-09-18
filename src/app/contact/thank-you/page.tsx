import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thank You - Coffee Logica",
  description:
    "Thank you for contacting Coffee Logica. We'll get back to you soon.",
};

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-10 h-10 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Thank You!
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              We've received your message and appreciate you taking the time to
              contact us. Our team will review your inquiry and get back to you
              as soon as possible.
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                What happens next?
              </h2>
              <ul className="text-amber-700 dark:text-amber-300 text-left space-y-2">
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  You'll receive a confirmation email shortly
                </li>
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  Our team will review your message within 24-48 hours
                </li>
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  We'll respond with detailed information or next steps
                </li>
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  For urgent matters, call us at +1 (555) 123-4567
                </li>
              </ul>
            </div>

            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Back to Home
              </Link>

              <Link
                href="/help"
                className="inline-block bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold py-3 px-8 rounded-lg transition-all duration-200"
              >
                Browse Help Center
              </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Need immediate assistance? Contact us directly:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  📧{" "}
                  <a
                    href="mailto:support@coffeelogica.com"
                    className="text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    support@coffeelogica.com
                  </a>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  📞{" "}
                  <a
                    href="tel:+15551234567"
                    className="text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    +1 (555) 123-4567
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
