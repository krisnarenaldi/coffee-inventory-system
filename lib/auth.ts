import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import OktaProvider from "next-auth/providers/okta";
import { comparePassword } from "./password-utils";
import { prisma } from "./prisma";
import { logUserLogin } from "./activity-logger";
import { validateSubscription } from "./subscription-validation";

// Define UserRole type and export it
export type UserRole =
  | "PLATFORM_ADMIN"
  | "SUPPORT"
  | "BILLING_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "BREWMASTER"
  | "WAREHOUSE_STAFF"
  | "SALES"
  | "STAFF";

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
    tenantId: string;
    tenant?: any;
    tenantSubdomain?: string;
    subscriptionExpired?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      tenantId: string;
      tenant?: any;
      tenantSubdomain?: string;
      subscriptionExpired?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    tenantId: string;
    tenant?: any;
    subscriptionExpired?: boolean;
  }
}

// Dynamic function to get auth options based on request
export const getAuthOptions = (): NextAuthOptions => {
  // Use environment variable or default to main domain
  const baseUrl = process.env.NEXTAUTH_URL || "https://coffeelogica.com";

  return {
    // adapter: PrismaAdapter(prisma), // Removed: conflicts with JWT strategy
    secret: process.env.NEXTAUTH_SECRET,
    debug: false, // Disable debug logging in production
    providers: [
      // Credentials Provider (always available)
      CredentialsProvider({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
          tenantSubdomain: { label: "Tenant Subdomain", type: "text" },
        },
        async authorize(credentials, req) {
          try {
            // Only log in development for debugging
            // Always log authentication attempts for debugging
            console.log("🔐 AUTH: Credentials received:", {
              email: credentials?.email,
              hasPassword: !!credentials?.password,
              tenantSubdomain: credentials?.tenantSubdomain,
              timestamp: new Date().toISOString(),
            });

            if (!credentials?.email || !credentials?.password) {
              if (process.env.NODE_ENV === "development") {
                console.log("❌ AUTH: Missing email or password");
              }
              return null;
            }

            // Use tenant context from credentials (passed from signin page)
            let tenantSubdomain = credentials.tenantSubdomain;

            // Treat 'www' as main domain (no subdomain)
            if (tenantSubdomain === "www") {
              tenantSubdomain = "";
            }

            let tenantId: string | undefined;
            let userTenant: any = null;

            console.log(
              "🔐 AUTH: Processing tenant subdomain:",
              `"${tenantSubdomain}"`,
              `(original: "${credentials.tenantSubdomain}")`
            );

            // If we have a tenant subdomain, find the tenant
            if (
              tenantSubdomain &&
              tenantSubdomain !== "null" &&
              tenantSubdomain !== ""
            ) {
              console.log(
                `🔍 AUTH: Looking up tenant with subdomain: "${tenantSubdomain}"`
              );
              try {
                const tenant = await prisma.tenant.findUnique({
                  where: { subdomain: tenantSubdomain },
                });
                tenantId = tenant?.id;
                userTenant = tenant;
                console.log(
                  `🏢 AUTH: Tenant lookup for "${tenantSubdomain}":`,
                  tenant ? `Found (${tenant.id})` : "Not found"
                );
              } catch (dbError) {
                console.error(
                  "❌ AUTH: Database error during tenant lookup:",
                  dbError
                );
                return null;
              }
            } else {
              console.log(
                "🔍 AUTH: No subdomain provided (main domain), will lookup user's tenant by email first"
              );
              // For main domain (including www), lookup tenant by email before password verification
              try {
                console.log(
                  `🔍 AUTH: Searching for user with email: ${credentials.email}`
                );
                const userWithTenant = await prisma.user.findFirst({
                  where: {
                    email: credentials.email,
                    isActive: true,
                  },
                  include: {
                    tenant: true,
                  },
                });

                console.log(
                  `👤 AUTH: User lookup result:`,
                  userWithTenant
                    ? {
                        id: userWithTenant.id,
                        email: userWithTenant.email,
                        name: userWithTenant.name,
                        isActive: userWithTenant.isActive,
                        tenantId: userWithTenant.tenantId,
                        hasPassword: !!userWithTenant.password,
                        tenant: userWithTenant.tenant
                          ? {
                              id: userWithTenant.tenant.id,
                              name: userWithTenant.tenant.name,
                              subdomain: userWithTenant.tenant.subdomain,
                              status: userWithTenant.tenant.status,
                            }
                          : null,
                      }
                    : "Not found"
                );

                if (userWithTenant && userWithTenant.tenant) {
                  tenantId = userWithTenant.tenantId;
                  userTenant = userWithTenant.tenant;
                  console.log(
                    `🏢 AUTH: Found user's tenant for main domain: ${userWithTenant.tenant.name} (subdomain: ${userWithTenant.tenant.subdomain})`
                  );
                } else {
                  console.log(
                    "❌ AUTH: No user found or user has no tenant - authentication will fail"
                  );
                  return null; // Don't fallback to demo, just fail
                }
              } catch (dbError) {
                console.error(
                  "❌ AUTH: Error during tenant lookup by email for main domain:",
                  dbError
                );
                return null;
              }
            }

            // Find user by email - if we have tenant context, validate within that tenant
            // If no tenant context (main domain login), find any active user
            // Special handling for PLATFORM_ADMIN: they can login from admin subdomain
            let user;
            if (tenantId && tenantId !== "") {
              // Use compound unique key when we have tenant context
              user = await prisma.user.findUnique({
                where: {
                  tenantId_email: {
                    tenantId: tenantId,
                    email: credentials.email,
                  },
                },
                include: {
                  tenant: true,
                },
              });
            } else {
              // Use findFirst when no tenant context
              user = await prisma.user.findFirst({
                where: {
                  email: credentials.email,
                  isActive: true,
                },
                include: {
                  tenant: true,
                },
              });
            }

            if (process.env.NODE_ENV === "development") {
              console.log(
                `👤 AUTH: First user lookup for "${credentials.email}":`,
                user ? `Found (${user.name}, ${user.role})` : "Not found"
              );
            }

            // If user found and no tenant context was provided, set the tenant info
            if (user && !userTenant) {
              userTenant = user.tenant;
              tenantId = user.tenantId;
              console.log(
                `🏢 AUTH: User's tenant discovered: ${userTenant.name} (${userTenant.subdomain})`
              );
            }

            // If no user found and we're on admin subdomain, try to find PLATFORM_ADMIN user
            if (!user && tenantSubdomain === "admin") {
              user = await prisma.user.findFirst({
                where: {
                  email: credentials.email,
                  isActive: true,
                  role: "PLATFORM_ADMIN",
                },
                include: {
                  tenant: true,
                },
              });
            }

            // Additional validation: if we have tenant subdomain, verify it matches
            // Exception: PLATFORM_ADMIN users can login from admin subdomain
            // Skip validation if no subdomain provided (main domain login)

            if (
              user &&
              tenantSubdomain &&
              tenantSubdomain !== "" &&
              tenantSubdomain !== "null" &&
              user.tenant?.subdomain !== tenantSubdomain &&
              !(user.role === "PLATFORM_ADMIN" && tenantSubdomain === "admin")
            ) {
              console.log(
                `❌ AUTH: Tenant mismatch - user tenant: ${user.tenant?.subdomain}, request subdomain: ${tenantSubdomain}`
              );
              return null;
            }

            console.log("✅ AUTH: Tenant validation passed");

            if (!user || !user.password) {
              console.log("❌ AUTH: User not found or no password");
              return null;
            }

            console.log(
              "✅ AUTH: User found with password, proceeding with validation"
            );

            // Check if the user's tenant is active
            console.log(
              `🏢 AUTH: Checking tenant status: ${user.tenant?.status}`
            );
            if (
              !user.tenant ||
              user.tenant.status === "CANCELLED" ||
              user.tenant.status === "SUSPENDED"
            ) {
              console.log("❌ AUTH: Tenant is inactive or not found");
              return null;
            }

            console.log("✅ AUTH: Tenant is active, checking password");

            // Measure password validation time for performance monitoring
            const passwordStartTime = Date.now();
            const isPasswordValid = await comparePassword(
              credentials.password,
              user.password
            );
            const passwordTime = Date.now() - passwordStartTime;

            if (process.env.NODE_ENV === "development") {
              console.log(
                `🔐 AUTH: Password validation took ${passwordTime}ms - Result: ${
                  isPasswordValid ? "✅ Valid" : "❌ Invalid"
                }`
              );
            }

            if (!isPasswordValid) {
              console.log("❌ AUTH: Authentication failed - invalid password");
              return null;
            }

            console.log("✅ AUTH: Password valid, handling pending checkout if needed");

            // On second login attempt, if subscription is still PENDING_CHECKOUT with a non-expiring period,
            // automatically revert the plan to Free so the user can access the app.
            // This avoids reliance on a cron job to clean up incomplete checkouts.
            try {
              const [subscription, freePlan] = await Promise.all([
                prisma.subscription.findUnique({
                  where: { tenantId: user.tenantId },
                }),
                prisma.subscriptionPlan.findFirst({
                  where: { name: "Free" },
                }),
              ]);

              if (
                subscription &&
                (subscription as any).status === "PENDING_CHECKOUT" &&
                (subscription as any).currentPeriodEnd == null &&
                // Treat non-null lastLogin as "second or subsequent" login attempt
                (user as any).lastLogin != null &&
                freePlan &&
                (subscription as any).planId !== (freePlan as any).id
              ) {
                await prisma.subscription.update({
                  where: { tenantId: user.tenantId },
                  data: {
                    planId: (freePlan as any).id,
                    currentPeriodEnd: null as any,
                  },
                });
                console.log(
                  "🔄 AUTH: Reverted PENDING_CHECKOUT subscription to Free plan on second login"
                );
              }
            } catch (revertError) {
              console.error(
                "❌ AUTH: Failed reverting to Free plan on second login:",
                revertError
              );
            }

            console.log("✅ AUTH: Pending checkout handling complete, updating last login");

            // If no tenant context was provided, lookup tenant by email after successful login
            if (!userTenant && !tenantId) {
              console.log(
                "🔍 AUTH: Looking up tenant by email after successful login"
              );
              try {
                // Query tenants table for subdomain based on email
                const userWithTenant = await prisma.user.findFirst({
                  where: {
                    email: credentials.email,
                    isActive: true,
                  },
                  include: {
                    tenant: true,
                  },
                });

                if (userWithTenant && userWithTenant.tenant) {
                  tenantId = userWithTenant.tenantId;
                  userTenant = userWithTenant.tenant;
                  console.log(
                    `🏢 AUTH: Found user's tenant: ${userWithTenant.tenant.name} (subdomain: ${userWithTenant.tenant.subdomain})`
                  );
                } else {
                  console.log(
                    "🔍 AUTH: No tenant found for user, setting default to demo"
                  );

                  // Set default subdomain to "demo" if query result is empty/null
                  const demoTenant = await prisma.tenant.findUnique({
                    where: { subdomain: "demo" },
                  });
                  if (demoTenant) {
                    tenantId = demoTenant.id;
                    userTenant = demoTenant;
                    console.log(
                      `🏢 AUTH: Using default demo tenant: ${demoTenant.name} (${demoTenant.id})`
                    );
                  }
                }
              } catch (dbError) {
                console.error(
                  "❌ AUTH: Error during tenant lookup by email:",
                  dbError
                );
                return null;
              }
            }

            // Update last login (async to not block authentication)
            prisma.user
              .update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
              })
              .catch((error) => {
                console.error("Failed to update last login:", error);
              });

            // Check subscription status; allow login but flag expired
            try {
              const subscriptionStartTime = Date.now();
              const subscriptionStatus = await validateSubscription(
                user.tenantId
              );
              const subscriptionTime = Date.now() - subscriptionStartTime;

              if (process.env.NODE_ENV === "development") {
                console.log(
                  `📋 AUTH: Subscription validation took ${subscriptionTime}ms`
                );
              }

              if (!subscriptionStatus.isActive) {
                console.log(
                  `Tenant ${user.tenant?.subdomain} subscription is expired or inactive - allowing login with expired flag`
                );
                // Mark expired but do NOT block login
                (user as any).subscriptionExpired = true;
              } else {
                (user as any).subscriptionExpired = false;
              }
            } catch (error) {
              console.error(
                "Error validating subscription during authorization:",
                error
              );
              // On validation errors, be conservative: mark as expired but allow login
              (user as any).subscriptionExpired = true;
            }

            console.log("✅ AUTH: Authentication successful for:", user.email);

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              tenantId: tenantId || user.tenantId,
              tenant: userTenant || user.tenant,
              subscriptionExpired: (user as any).subscriptionExpired ?? false,
            };
          } catch (error) {
            console.error("❌ AUTH: Error during authentication:", error);
            // If it's a subscription expired error, re-throw it so NextAuth can handle it
            if (
              error instanceof Error &&
              error.message === "SUBSCRIPTION_EXPIRED"
            ) {
              throw error;
            }
            return null;
          }
        },
      }),

      // OAuth Providers (only if environment variables are available)
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? [
            GoogleProvider({
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              authorization: {
                params: {
                  prompt: "consent",
                  access_type: "offline",
                  response_type: "code",
                },
              },
            }),
          ]
        : []),

      ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
        ? [
            AzureADProvider({
              clientId: process.env.AZURE_AD_CLIENT_ID,
              clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
              tenantId: process.env.AZURE_AD_TENANT_ID,
              authorization: {
                params: {
                  scope: "openid profile email User.Read",
                },
              },
            }),
          ]
        : []),

      ...(process.env.OKTA_CLIENT_ID &&
      process.env.OKTA_CLIENT_SECRET &&
      process.env.OKTA_ISSUER
        ? [
            OktaProvider({
              clientId: process.env.OKTA_CLIENT_ID,
              clientSecret: process.env.OKTA_CLIENT_SECRET,
              issuer: process.env.OKTA_ISSUER,
              authorization: {
                params: {
                  scope: "openid profile email",
                },
              },
            }),
          ]
        : []),
    ],
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60, // 24 hours
    },
    jwt: {
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
      sessionToken: {
        name:
          process.env.NODE_ENV === "production"
            ? "__Secure-next-auth.session-token"
            : "next-auth.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          // Remove domain setting for better security - each subdomain gets its own cookies
          // domain: undefined, // Each subdomain will have isolated cookies
        },
      },
      callbackUrl: {
        name:
          process.env.NODE_ENV === "production"
            ? "__Secure-next-auth.callback-url"
            : "next-auth.callback-url",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          // Remove domain setting for better security - each subdomain gets its own cookies
          // domain: undefined, // Each subdomain will have isolated cookies
        },
      },
      csrfToken: {
        name:
          process.env.NODE_ENV === "production"
            ? "__Host-next-auth.csrf-token"
            : "next-auth.csrf-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          // CSRF token should not have domain setting for __Host- prefix
        },
      },
    },
    callbacks: {
      async signIn({ user, account, profile }) {
        // Handle OAuth sign-ins
        if (account?.provider !== "credentials") {
          try {
            // Check if user exists in our database
            const existingUser = await prisma.user.findFirst({
              where: {
                email: user.email!,
                isActive: true,
              },
              include: {
                tenant: true,
              },
            });

            if (!existingUser) {
              // For OAuth, we need to determine which tenant this user belongs to
              // This could be based on email domain or other logic
              const emailDomain = user.email!.split("@")[1];

              // Try to find a tenant that allows this domain
              const tenant = await prisma.tenant.findFirst({
                where: {
                  AND: [
                    {
                      OR: [
                        { domain: emailDomain },
                        { status: "ACTIVE" }, // Fallback to any active tenant for demo
                      ],
                    },
                    { status: "ACTIVE" }, // Ensure tenant is active
                  ],
                },
              });

              if (!tenant) {
                console.log(`No tenant found for domain: ${emailDomain}`);
                return false; // Reject sign-in
              }

              // Create user account for OAuth
              const newUser = await prisma.user.create({
                data: {
                  email: user.email!,
                  name: user.name || profile?.name || user.email!.split("@")[0],
                  tenantId: tenant.id,
                  role: "STAFF", // Default role for OAuth users
                  isActive: true,
                  emailVerified: new Date(), // OAuth emails are considered verified
                  lastLogin: new Date(),
                },
                include: {
                  tenant: true,
                },
              });

              // Update user object for JWT
              user.id = newUser.id;
              user.role = newUser.role;
              user.tenantId = newUser.tenantId;
              user.tenant = newUser.tenant;
            } else {
              // Check if the existing user's tenant is active
              if (
                !existingUser.tenant ||
                existingUser.tenant.status === "CANCELLED" ||
                existingUser.tenant.status === "SUSPENDED"
              ) {
                console.log(
                  `User's tenant is not active: ${existingUser.tenant?.status}`
                );
                return false; // Reject sign-in
              }

              // Update existing user's last login
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { lastLogin: new Date() },
              });

              // Update user object for JWT
              user.id = existingUser.id;
              user.role = existingUser.role;
              user.tenantId = existingUser.tenantId;
              user.tenant = existingUser.tenant;
            }

            // Check subscription expiration for OAuth users
            if (user.tenantId) {
              try {
                const subscriptionStatus = await validateSubscription(
                  user.tenantId
                );
                if (!subscriptionStatus.isActive) {
                  console.log(
                    `OAuth sign-in rejected: tenant ${user.tenant?.subdomain} subscription is expired or inactive`
                  );
                  // Use the tenant subdomain to construct the full URL
                  const tenantSubdomain = user.tenant?.subdomain;
                  const baseUrl =
                    process.env.NODE_ENV === "production"
                      ? "https://www.coffeelogica.com"
                      : "http://localhost:3000";

                  if (
                    tenantSubdomain &&
                    process.env.NODE_ENV !== "production"
                  ) {
                    return `http://${tenantSubdomain}.localhost:3000/subscription?expired=true`;
                  } else {
                    return `${baseUrl}/subscription?expired=true`;
                  }
                }
              } catch (error) {
                console.error(
                  "Error validating subscription during OAuth sign-in:",
                  error
                );
                // Use the tenant subdomain to construct the full URL for error case
                const tenantSubdomain = user.tenant?.subdomain;
                const baseUrl =
                  process.env.NODE_ENV === "production"
                    ? "https://www.coffeelogica.com"
                    : "http://localhost:3000";

                if (tenantSubdomain && process.env.NODE_ENV !== "production") {
                  return `http://${tenantSubdomain}.localhost:3000/subscription?error=validation_failed`;
                } else {
                  return `${baseUrl}/subscription?error=validation_failed`;
                }
              }
            }

            // Log OAuth login activity (async to not block)
            logUserLogin(
              user.tenantId,
              user.id,
              undefined, // IP address not available in callback
              `OAuth-${account?.provider || "unknown"}`
            ).catch((error) => {
              console.error("Failed to log OAuth login:", error);
            });

            return true;
          } catch (error) {
            console.error("OAuth sign-in error:", error);
            return false;
          }
        }

        // For credentials sign-in, validate tenant context
        if (account?.provider === "credentials") {
          // The user object should already have tenant information from the authorize function
          // Additional validation can be added here if needed
          if (
            user.tenant &&
            (user.tenant.status === "CANCELLED" ||
              user.tenant.status === "SUSPENDED")
          ) {
            console.log(
              `Credentials sign-in rejected: tenant ${user.tenant.subdomain} is ${user.tenant.status}`
            );
            return false;
          }

          // Subscription expiration is now handled in the authorize function
          // Allow sign-in to proceed normally
        }

        return true; // Allow sign-in
      },

      async jwt({ token, user, account }) {
        if (user) {
          token.role = user.role;
          token.tenantId = user.tenantId;
          token.tenant = user.tenant;
          // propagate expired flag
          // @ts-expect-error optional at runtime
          token.subscriptionExpired = (user as any).subscriptionExpired ?? false;

          // Log credentials login activity (async to not block)
          if (account && account.provider === "credentials") {
            // Use fire-and-forget logging to not block authentication
            logUserLogin(
              user.tenantId,
              user.id,
              undefined, // IP address not available in callback
              "credentials"
            ).catch((error) => {
              console.error("Failed to log user login:", error);
            });
          }
        }
        return token;
      },

      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.sub!;
          session.user.role = token.role;
          session.user.tenantId = token.tenantId;
          session.user.tenant = token.tenant;
          session.user.tenantSubdomain = token.tenant?.subdomain;
          // include expired flag in session
          // @ts-expect-error optional at runtime
          session.user.subscriptionExpired = (token as any).subscriptionExpired ?? false;
        }
        return session;
      },

      async redirect({ url, baseUrl }) {
        console.log("🔄 AUTH REDIRECT: url =", url, "baseUrl =", baseUrl);

        // Handle main domain to tenant subdomain redirect
        try {
          const urlObj = new URL(url, baseUrl);
          const baseUrlObj = new URL(baseUrl);

          // If redirecting to dashboard from main domain, check if we should redirect to tenant subdomain
          if (
            urlObj.pathname === "/dashboard" &&
            (baseUrlObj.hostname === "www.coffeelogica.com" ||
              baseUrlObj.hostname === "coffeelogica.com")
          ) {
            // We need to get the user's tenant subdomain from the token
            // This is tricky in the redirect callback, so we'll handle it in the signin page instead
            console.log(
              "🏢 AUTH REDIRECT: Dashboard redirect from main domain"
            );
          }

          // Default redirect behavior
          if (url.startsWith("/")) return `${baseUrl}${url}`;
          else if (new URL(url).origin === baseUrl) return url;
          return baseUrl;
        } catch (error) {
          console.error("Error in redirect callback:", error);
          // Fallback to default behavior
          if (url.startsWith("/")) return `${baseUrl}${url}`;
          else if (new URL(url).origin === baseUrl) return url;
          return baseUrl;
        }
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  };
};

// Keep the original authOptions for backward compatibility
export const authOptions: NextAuthOptions = getAuthOptions();

// Utility functions for role-based access control
export const hasRole = (
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean => {
  return requiredRoles.includes(userRole);
};

export const isPlatformAdmin = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["PLATFORM_ADMIN"]);
};

export const isTenantAdmin = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER"]);
};

export const canManageInventory = (userRole: UserRole): boolean => {
  return hasRole(userRole, [
    "ADMIN",
    "MANAGER",
    "BREWMASTER",
    "WAREHOUSE_STAFF",
    "STAFF",
  ]);
};

export const canManageProducts = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER", "BREWMASTER", "STAFF"]);
};

export const canManagePackagingTypes = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER", "BREWMASTER"]);
};

export const canViewReports = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER", "BREWMASTER", "SALES"]);
};

export const canManageUsers = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN"]);
};
