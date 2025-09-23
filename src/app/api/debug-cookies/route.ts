import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Get all cookies
    const cookies = request.headers.get("cookie") || "";
    const cookieArray = cookies.split(";").map(c => c.trim());
    
    // Parse cookies into object
    const cookieObj: Record<string, string> = {};
    cookieArray.forEach(cookie => {
      const [name, value] = cookie.split("=");
      if (name && value) {
        cookieObj[name] = value;
      }
    });
    
    // Get NextAuth specific cookies
    const nextAuthCookies = Object.keys(cookieObj).filter(key => 
      key.includes("next-auth") || key.includes("__Secure-next-auth") || key.includes("__Host-next-auth")
    );
    
    return NextResponse.json({
      session: session ? {
        user: session.user,
        expires: session.expires
      } : null,
      cookies: {
        all: cookieObj,
        nextAuth: nextAuthCookies.reduce((acc, key) => {
          acc[key] = cookieObj[key];
          return acc;
        }, {} as Record<string, string>),
        count: nextAuthCookies.length
      },
      headers: {
        userAgent: request.headers.get("user-agent"),
        host: request.headers.get("host"),
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer")
      },
      debug: {
        hasSessionToken: nextAuthCookies.some(key => key.includes("session-token")),
        hasCsrfToken: nextAuthCookies.some(key => key.includes("csrf-token")),
        hasCallbackUrl: nextAuthCookies.some(key => key.includes("callback-url"))
      }
    });
  } catch (error) {
    console.error("Debug cookies error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
