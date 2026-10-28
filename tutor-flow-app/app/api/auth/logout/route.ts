import { NextRequest, NextResponse } from "next/server";
import { getSiteOrigin } from "@/src/features/auth/config";
import { destroySession } from "@/src/features/auth/session";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.json({ error: "Unable to log out." }, { status: 403 });

  try {
    if (new URL(origin).origin !== getSiteOrigin()) {
      return NextResponse.json({ error: "Unable to log out." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Unable to log out." }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/login", getSiteOrigin()), 303);
  destroySession(response);
  return response;
}
