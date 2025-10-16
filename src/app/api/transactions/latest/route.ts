import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        tenantId: session.user.tenantId,
        status: "PENDING" as any,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        billingCycle: true,
        status: true,
        subscriptionPlanId: true,
        amount: true,
        createdAt: true,
      },
    });

    return NextResponse.json(transaction || {});
  } catch (error) {
    console.error("Error fetching latest transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
