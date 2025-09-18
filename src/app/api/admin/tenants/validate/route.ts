import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    const email = searchParams.get('email');

    if (!subdomain && !email) {
      return NextResponse.json(
        { error: 'Either subdomain or email parameter is required' },
        { status: 400 }
      );
    }

    let exists = false;

    if (subdomain) {
      // Check if subdomain exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { subdomain }
      });
      exists = !!existingTenant;
    } else if (email) {
      // Check if email exists
      const existingUser = await prisma.user.findFirst({
        where: { email }
      });
      exists = !!existingUser;
    }

    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}