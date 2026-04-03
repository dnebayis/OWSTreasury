import { NextRequest, NextResponse } from "next/server";
import { owsClient } from "@/lib/ows/client";

export async function POST(request: NextRequest) {
  try {
    const { walletName, chains } = await request.json();

    if (!walletName || !chains) {
      return NextResponse.json(
        { error: "walletName and chains required" },
        { status: 400 }
      );
    }

    const wallet = await owsClient.createWallet(walletName, chains);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create wallet" },
      { status: 500 }
    );
  }
}
