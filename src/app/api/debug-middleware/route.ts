import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const headers = Object.fromEntries(request.headers.entries())
  
  console.log('=== DEBUG MIDDLEWARE HEADERS ===')
  console.log('All headers:', headers)
  console.log('Host:', request.headers.get('host'))
  console.log('X-Forwarded-Host:', request.headers.get('x-forwarded-host'))
  console.log('X-Tenant-ID:', request.headers.get('x-tenant-id'))
  console.log('X-Tenant-Subdomain:', request.headers.get('x-tenant-subdomain'))
  
  return NextResponse.json({
    message: 'Debug endpoint',
    headers: headers,
    middlewareHeaders: {
      'x-tenant-id': request.headers.get('x-tenant-id'),
      'x-tenant-subdomain': request.headers.get('x-tenant-subdomain')
    }
  })
}