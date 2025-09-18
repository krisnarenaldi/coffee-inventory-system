import { NextRequest } from 'next/server';
import { handleCSRFTokenRequest } from '../../../../lib/csrf-protection';

export async function GET(req: NextRequest) {
  return handleCSRFTokenRequest(req);
}