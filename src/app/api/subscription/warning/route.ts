import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { checkSubscriptionWarning } from "../../../../../lib/subscription-validation";
import {
  getCachedOrFetch,
  CacheKeys,
  CacheTTL,
} from "../../../../../lib/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cache subscription warning for 1 minute
    const warningData = await getCachedOrFetch(
      CacheKeys.subscriptionWarning(session.user.tenantId),
      async () => {
        return await checkSubscriptionWarning(session.user.tenantId);
      },
      CacheTTL.SHORT // 1 minute cache for warning data
    );

    return NextResponse.json(warningData);
  } catch (error) {
    console.error("Error checking subscription warning:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
