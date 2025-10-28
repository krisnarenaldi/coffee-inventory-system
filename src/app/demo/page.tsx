import Link from "next/link";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="#" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-base">☕️</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Demo Account
              </span>
            </Link>
            <Link
              href="/"
              className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-md w-full">
          {/* Demo Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">🎯</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Try Our Demo
            </h1>

            {/* Description */}
            <p className="text-gray-600 mb-8">
              Experience the full power of our brewery inventory management
              system with our interactive demo.
            </p>

            {/* Demo Credentials */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-amber-800 mb-3">
                Demo Login Credentials
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Email:</span>
                  <code className="bg-white px-2 py-1 rounded text-amber-700 font-mono">
                    admin@kopidemo.com
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Password:</span>
                  <code className="bg-white px-2 py-1 rounded text-amber-700 font-mono">
                    Kopidemo123#
                  </code>
                </div>
              </div>
            </div>

            {/* Demo Button */}
            <a
              href="https://kopi-demo.coffeelogica.com/auth/signin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">🚀</span>
              Launch Demo
            </a>

            {/* Additional Info */}
            <p className="text-xs text-gray-500 mt-4">
              The demo opens in a new tab with sample brewery data
            </p>
          </div>

          {/* Features Preview */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center border border-amber-100">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-gray-700">
                Live Dashboard
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center border border-amber-100">
              <div className="text-2xl mb-2">☕️</div>
              <div className="text-sm font-medium text-gray-700">
                Batch Tracking
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center border border-amber-100">
              <div className="text-2xl mb-2">📦</div>
              <div className="text-sm font-medium text-gray-700">Inventory</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center border border-amber-100">
              <div className="text-2xl mb-2">📈</div>
              <div className="text-sm font-medium text-gray-700">Analytics</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
