import { NextResponse } from "next/server";
import { owsClient } from "@/lib/ows/client";
import { getEVMBalance } from "@/lib/chains/evm";
import { getSolanaBalance } from "@/lib/chains/solana";
import { getAuditLogs } from "@/lib/db";

export async function GET() {
  try {
    const wallets = await owsClient.listWallets();
    let totalEVM = 0;
    let totalSolana = 0;

    // Aggregate balances across all wallets
    for (const wallet of wallets) {
      const evmAddr = wallet.addresses.find(a => (a.chain as string) === "evm" || (a.chain as string) === "evm:sepolia")?.address;
      const solAddr = wallet.addresses.find(a => (a.chain as string) === "solana" || (a.chain as string) === "solana:devnet")?.address;

      if (evmAddr) {
        try {
          const bal = await getEVMBalance(evmAddr);
          totalEVM += parseFloat(bal.balance);
        } catch (err) {
          console.error(`EVM balance fetch failed for ${evmAddr}:`, err);
        }
      }
      if (solAddr) {
        try {
          const bal = await getSolanaBalance(solAddr);
          totalSolana += parseFloat(bal.balance);
        } catch (err) {
          console.error(`Solana balance fetch failed for ${solAddr}:`, err);
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
