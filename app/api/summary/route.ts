import { NextResponse } from "next/server";
import { getEVMBalance } from "@/lib/chains/evm";
import { getSolanaBalance } from "@/lib/chains/solana";
import { getAuditLogs, getWallets } from "@/lib/db";

export async function GET() {
  try {
    // Read wallets directly from Supabase — no OWS CLI needed
    const wallets = await getWallets();
    let totalEVM = 0;
    let totalSolana = 0;

    for (const wallet of wallets) {
      const addresses: Array<{ chain: string; address: string }> =
        Array.isArray(wallet.addresses) ? wallet.addresses : [];

      const evmAddr = addresses.find(
        (a) => a.chain === "evm" || a.chain === "evm:sepolia"
      )?.address;
      const solAddr = addresses.find(
        (a) => a.chain === "solana" || a.chain === "solana:devnet"
      )?.address;

      if (evmAddr) {
        try {
          const bal = await getEVMBalance(evmAddr);
          totalEVM += parseFloat(bal.balance);
        } catch {
          // RPC failure — skip
        }
      }
      if (solAddr) {
        try {
          const bal = await getSolanaBalance(solAddr);
          totalSolana += parseFloat(bal.balance);
        } catch {
          // RPC failure — skip
        }
      }
    }

    const lastLogs = await getAuditLogs({ limit: 1 });
    const lastAction = lastLogs.length > 0 ? lastLogs[0].operation : "None";

    return NextResponse.json({
      totalWallets: wallets.length,
      totalEVMBalance: totalEVM.toFixed(4),
      totalSolanaBalance: totalSolana.toFixed(2),
      lastAction,
    });
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
