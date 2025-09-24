import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  try {
    // Get the user's token to determine their tenant
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.tenant?.subdomain) {
      console.log("❌ TENANT REDIRECT: No token or tenant subdomain found");
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    const tenantSubdomain = token.tenant.subdomain;
    console.log("🔄 TENANT REDIRECT: Redirecting to tenant:", tenantSubdomain);

    // Create the tenant URL
    const tenantUrl = `https://${tenantSubdomain}.coffeelogica.com/dashboard`;
    
    // Create a response that redirects to the tenant subdomain
    const response = NextResponse.redirect(tenantUrl);
    
    // Copy session cookies to the new domain
    const sessionCookie = request.cookies.get("next-auth.session-token") || 
                         request.cookies.get("__Secure-next-auth.session-token");
    
    if (sessionCookie) {
      // Set the session cookie for the tenant subdomain
      response.cookies.set({
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: ".coffeelogica.com", // Allow cookie to work across subdomains
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("❌ TENANT REDIRECT: Error:", error);
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
}
