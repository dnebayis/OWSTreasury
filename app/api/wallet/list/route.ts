import { NextRequest, NextResponse } from "next/server";
import { owsClient } from "@/lib/ows/client";

export async function GET() {
  try {
    const wallets = await owsClient.listWallets();

    return NextResponse.json({
      success: true,
      wallets,
      total: wallets.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list wallets" },
      { status: 500 }
    );
  }
}
