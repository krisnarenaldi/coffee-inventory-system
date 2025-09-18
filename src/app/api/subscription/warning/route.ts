import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { checkSubscriptionWarning } from "../../../../../lib/subscription-validation";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const warningData = await checkSubscriptionWarning(session.user.tenantId);

    return NextResponse.json(warningData);
  } catch (error) {
    console.error("Error checking subscription warning:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}