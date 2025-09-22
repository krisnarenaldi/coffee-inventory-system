// src/app/api/debug-env/route.js
export async function GET() {
  return Response.json({
    hasDatabase: !!process.env.DATABASE_URL,
    fullValue: process.env.DATABASE_URL, // Show the full value temporarily
    allEnvKeys: Object.keys(process.env).filter((key) =>
      key.includes("DATABASE")
    ),
    nodeEnv: process.env.NODE_ENV,
  });
}
