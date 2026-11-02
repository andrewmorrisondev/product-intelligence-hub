import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "./lib/auth";

export function proxy(request: NextRequest) {
  if (!isAuthorized(request.headers)) {
    return new NextResponse("Private workspace: enter configured credentials (admin + WORKSPACE_PASSWORD).", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Product Intelligence - Private"', "Cache-Control": "no-store" },
    });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/workspace/:path*", "/api/private/:path*"] };
