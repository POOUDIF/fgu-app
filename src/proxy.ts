import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

const PROTECTED = ["/dashboard", "/desa", "/juri", "/admin"];

export async function proxy(request: NextRequest) {
  const { response, authed } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  if (isProtected && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)"],
};
