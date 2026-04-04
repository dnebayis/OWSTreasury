import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;

  // If no SITE_PASSWORD is set, allow all access (dev mode)
  if (!sitePassword) {
    return NextResponse.json({ ok: true });
  }

  const { password } = await request.json();

  if (password === sitePassword) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
