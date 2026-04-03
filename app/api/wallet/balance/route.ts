import { NextRequest, NextResponse } from "next/server";
import { owsClient } from "@/lib/ows/client";
import { getEVMBalance, simulateEVMTransaction } from "@/lib/chains/evm";
import { getSolanaBalance, simulateSolanaTransaction } from "@/lib/chains/solana";

export async function POST(request: NextRequest) {
  try {
    const { walletName, chain, tokenAddress } = await request.json();

    if (!walletName || !chain) {
      return NextResponse.json(
        { error: "walletName and chain required" },
        { status: 400 }
      );
    }

    const wallet = await owsClient.getWallet(walletName);
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const address = wallet.addresses.find((a) => a.chain === chain)?.address;
    if (!address) {
      return NextResponse.json(
        { error: `No ${chain} address in wallet` },
        { status: 400 }
      );
    }

    let balance: any;

    if (chain === "evm") {
      balance = await getEVMBalance(address, tokenAddress);
    } else if (chain === "solana") {
      balance = await getSolanaBalance(address);
    } else {
      return NextResponse.json(
        { error: `Unsupported chain: ${chain}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      walletName,
      chain,
      address,
      ...balance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get balance" },
      { status: 500 }
    );
  }
}
