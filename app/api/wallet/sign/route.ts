import { NextRequest, NextResponse } from "next/server";
import { toolExecutor } from "@/lib/agent/executor.server";

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signing failed" },
      { status: 500 }
    );
  }
}
