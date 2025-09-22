// src/app/api/debug-env/route.js
export async function GET() {
  return Response.json({
    hasDatabase: !!process.env.DATABASE_URL,
    preview: process.env.DATABASE_URL?.substring(0, 50) + "...",
    nodeEnv: process.env.NODE_ENV,
  });
}
