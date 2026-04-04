import { NextRequest, NextResponse } from "next/server";
import { getVaultData } from "@/lib/db";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing wallet name" }, { status: 400 });
  }

  const blob = await getVaultData(name);
  if (!blob) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const date = new Date().toISOString().split("T")[0];
  const filename = `ows-backup-${name}-${date}.json`;

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
