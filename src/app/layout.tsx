import type { Metadata } from "next";
import { Geist, Geist_Mono, Josefin_Sans } from "next/font/google";
import { Providers } from "../components/providers";
import GlobalSubscriptionWarning from "../components/GlobalSubscriptionWarning";
import Script from "next/script";
import "./globals.css";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const josefinSans = Josefin_Sans({
  variable: "--font-josefin-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title:
    "Coffee Shop Inventory Management System | Sistem Manajemen Inventori Kedai Kopi",
  description:
    "Comprehensive SaaS solution for coffee shops to manage inventory from raw materials to finished products. Solusi SaaS lengkap untuk kedai kopi dalam mengelola inventori dari bahan baku hingga produk jadi.",
  keywords: [
    "coffee shop inventory",
    "inventory management",
    "SaaS solution",
    "coffee business",
    "stock management",
    "inventori kedai kopi",
    "manajemen inventori",
    "solusi SaaS",
    "bisnis kopi",
    "manajemen stok",
  ],
  authors: [{ name: "Coffee Inventory Team" }],
  creator: "Coffee Inventory Management System",
  publisher: "Coffee Inventory Management System",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en",
      "id-ID": "/id",
    },
  },
  openGraph: {
    title:
      "Coffee Shop Inventory Management System | Sistem Manajemen Inventori Kedai Kopi",
    description:
      "Comprehensive SaaS solution for coffee shops to manage inventory from raw materials to finished products. Solusi SaaS lengkap untuk kedai kopi dalam mengelola inventori dari bahan baku hingga produk jadi.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    siteName: "Coffee Inventory Management",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Coffee Shop Inventory Management System - Sistem Manajemen Inventori Kedai Kopi",
      },
    ],
    locale: "en_US",
    alternateLocale: ["id_ID"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Coffee Shop Inventory Management System | Sistem Manajemen Inventori Kedai Kopi",
    description:
      "Comprehensive SaaS solution for coffee shops to manage inventory from raw materials to finished products. Solusi SaaS lengkap untuk kedai kopi dalam mengelola inventori dari bahan baku hingga produk jadi.",
    images: ["/twitter-image.png"],
    creator: "@coffeeinventory",
    site: "@coffeeinventory",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${josefinSans.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <GlobalSubscriptionWarning />
          {children}
        </Providers>
      </body>
    </html>
  );
}
