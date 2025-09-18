import NextAuth from "next-auth";
import { getAuthOptions } from "../../../../../lib/auth";
import { NextRequest } from "next/server";

const handler = (req: NextRequest, res: any) => {
  return NextAuth(req, res, getAuthOptions(req));
};

export { handler as GET, handler as POST };
