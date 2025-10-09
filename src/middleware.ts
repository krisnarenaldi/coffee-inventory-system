import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Extract subdomain from hostname
function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null;

  // Remove port if present
  const cleanHostname = hostname.split(":")[0];

  // Skip IP addresses
  if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)) {
    return null;
  }

  const parts = cleanHostname.split(".");

  // Handle localhost subdomains (e.g., coffee-logic.localhost) - for development
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    return parts[0]; // Return the first part as subdomain
  }

  // Handle coffeelogica.com subdomains (e.g., tenant.coffeelogica.com)
  if (
    parts.length >= 3 &&
    parts[parts.length - 2] === "coffeelogica" &&
    parts[parts.length - 1] === "com"
  ) {
    const subdomain = parts[0];
    // Treat 'www' as the main domain, not a tenant subdomain
    if (subdomain === "www") {
      return null;
    }
    return subdomain; // Return the first part as subdomain
  }

  // Handle regular domains (e.g., coffee-logic.example.com)
  if (parts.length > 2) {
    return parts[0]; // Return the first part as subdomain
  }

  return null;
}

// Simple tenant validation without database calls for Edge Runtime
function validateTenant(subdomain: string) {
  // For now, return a mock tenant object to avoid database calls in middleware
  // In production, you might want to cache tenant data or use a different approach
  return {
    id: `tenant-${subdomain}`,
    subdomain: subdomain,
    name:
      subdomain.charAt(0).toUpperCase() + subdomain.slice(1).replace("-", " "),
  };
}

// Check if route is public (doesn't require tenant context)
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/auth/error",
    "/api/auth",
    "/api/health",
  ];

  return publicRoutes.some((route) => pathname.startsWith(route));
}

// Allow routes required for renewing or checking out
function isRenewalRoute(pathname: string): boolean {
  const renewalRoutes = [
    "/subscription",
    "/checkout",
    "/api/subscription",
    "/api/checkout",
  ];
  return renewalRoutes.some((route) => pathname.startsWith(route));
}

// Check if route is admin route
function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Only log in development
  if (process.env.NODE_ENV === "development") {
    console.log("🚀 MIDDLEWARE EXECUTING! Path:", pathname);
    console.log("🔍 Processing request for:", hostname, pathname);
  }

  // Skip middleware for static assets and API routes that don't need tenant context
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Extract subdomain
  const subdomain = extractSubdomain(hostname);

  if (process.env.NODE_ENV === "development") {
    console.log("🏢 Extracted subdomain:", subdomain);
  }

  // For admin subdomain or admin routes, skip tenant resolution
  if (subdomain === "admin" || isAdminRoute(pathname)) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🔧 Admin subdomain/route detected, skipping tenant resolution"
      );
    }
    response.headers.set("X-Tenant-ID", "");
    response.headers.set("X-Tenant-Subdomain", "");

    // Enforce authentication on protected routes even on admin subdomain
    if (!isPublicRoute(pathname)) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔒 Admin subdomain protected route without token, redirecting to signin"
          );
        }
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }

      // If subscription expired, force renewal flow except on renewal routes
      // @ts-expect-error token may carry custom field
      if (token.subscriptionExpired && !isRenewalRoute(pathname)) {
        if (process.env.NODE_ENV === "development") {
          console.log("⏳ Subscription expired, redirecting to renewal page");
        }
        return NextResponse.redirect(
          new URL("/subscription?expired=true", request.url)
        );
      }
    }
    return response;
  }

  // For public routes without subdomain or on admin subdomain, allow access
  if (isPublicRoute(pathname) && (!subdomain || subdomain === "admin")) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🌐 Public route without subdomain or on admin subdomain, allowing access"
      );
    }
    response.headers.set("X-Tenant-ID", "");
    response.headers.set("X-Tenant-Subdomain", "");
    return response;
  }

  // If we have a subdomain, resolve tenant
  if (subdomain) {
    const tenant = validateTenant(subdomain);

    if (tenant) {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Tenant found:", tenant.name, tenant.id);
      }

      // For protected routes, ensure user is authenticated
      if (!isPublicRoute(pathname)) {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
          return NextResponse.redirect(new URL("/auth/signin", request.url));
        }

        // If subscription expired, force renewal flow except on renewal routes
        // @ts-expect-error token may carry custom field
        if (token.subscriptionExpired && !isRenewalRoute(pathname)) {
          if (process.env.NODE_ENV === "development") {
            console.log("⏳ Subscription expired, redirecting to renewal page");
          }
          return NextResponse.redirect(
            new URL("/subscription?expired=true", request.url)
          );
        }
      }

      response.headers.set("X-Tenant-ID", tenant.id);
      response.headers.set("X-Tenant-Subdomain", tenant.subdomain);
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("❌ Tenant not found for subdomain:", subdomain);
      }
      // Redirect to main domain or show error
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  } else {
    // No subdomain - check if user is authenticated for protected routes
    if (!isPublicRoute(pathname)) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔄 No subdomain and no token for protected route, redirecting to signin"
          );
        }
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }

      // If subscription expired, force renewal flow except on renewal routes
      // @ts-expect-error token may carry custom field
      if (token.subscriptionExpired && !isRenewalRoute(pathname)) {
        if (process.env.NODE_ENV === "development") {
          console.log("⏳ Subscription expired, redirecting to renewal page");
        }
        return NextResponse.redirect(
          new URL("/subscription?expired=true", request.url)
        );
      }

      // User is authenticated on main domain - set tenant context from token
      if (token.tenantId && token.tenant?.subdomain) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "✅ Authenticated user on main domain, setting tenant context:",
            token.tenant.subdomain
          );
        }
        response.headers.set("X-Tenant-ID", token.tenantId);
        response.headers.set("X-Tenant-Subdomain", token.tenant.subdomain);
      } else {
        response.headers.set("X-Tenant-ID", "");
        response.headers.set("X-Tenant-Subdomain", "");
      }
    } else {
      response.headers.set("X-Tenant-ID", "");
      response.headers.set("X-Tenant-Subdomain", "");
    }
  }

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
