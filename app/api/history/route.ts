import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/db";

export async function GET() {
  try {
    const logs = await getAuditLogs({ limit: 50 });
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
