import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    
    return NextResponse.json({
      databaseUrl: databaseUrl ? `${databaseUrl.substring(0, 20)}...` : 'NOT_SET',
      nextAuthUrl: nextAuthUrl || 'NOT_SET',
      nextAuthSecret: nextAuthSecret ? 'SET' : 'NOT_SET',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    });
    
  } catch (error) {
    console.error('Test env error:', error);
    return NextResponse.json({ 
      error: 'Failed to test env',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
