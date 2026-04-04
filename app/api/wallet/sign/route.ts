import { NextRequest, NextResponse } from "next/server";
import { toolExecutor } from "@/lib/agent/executor.server";
import { friendlyError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  if (process.env.SITE_PASSWORD) {
    const token = request.headers.get("x-ows-auth");
    if (token !== "1") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const { walletName, chain, to, amount, token } = body;

    if (!walletName || !chain || !to || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await toolExecutor.execute("sign_and_send_transaction", {
      walletName,
      chain,
      to,
      amount,
      token: token || "ETH",
      requireApproval: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Signing failed";
    return NextResponse.json({ error: friendlyError(raw) }, { status: 500 });
  }
}
