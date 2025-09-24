import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SignJWT } from "jose";

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

    // Simply redirect to tenant subdomain signin with email pre-filled
    // User will need to enter password again for security
    const tenantUrl = `https://${tenantSubdomain}.coffeelogica.com/auth/signin?email=${encodeURIComponent(
      token.email || ""
    )}&from=main`;

    console.log("🔐 TENANT REDIRECT: Created secure redirect token");

    return NextResponse.redirect(tenantUrl);
  } catch (error) {
    console.error("❌ TENANT REDIRECT: Error:", error);
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
}
