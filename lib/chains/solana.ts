import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

/**
 * Solana (devnet) helpers using @solana/web3.js
 */

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com",
  "confirmed"
);

export async function getSolanaBalance(address: string): Promise<{
  balance: string;
  token: string;
  decimals: number;
}> {
  try {
    const publicKey = new PublicKey(address);
    const lamports = await connection.getBalance(publicKey);
    const sol = (lamports / 1e9).toFixed(9).replace(/\.?0+$/, "");

    return {
      balance: sol,
      token: "SOL",
      decimals: 9,
    };
  } catch (error) {
    throw new Error(
      `Failed to get Solana balance: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function simulateSolanaTransaction(params: {
  to: string;
  amount: string;
  token?: string;
}): Promise<{
  success: boolean;
  gasEstimate: string;
  totalCost: string;
  balanceAfter: string;
  error?: string;
}> {
  try {
    const { to, amount } = params;

    // Validate addresses
    try {
      new PublicKey(to);
    } catch {
      return {
        success: false,
        gasEstimate: "0",
        totalCost: "0",
        balanceAfter: "0",
        error: "Invalid Solana address",
      };
    }

    // Estimate transaction cost
    const lamportsToSend = Math.floor(parseFloat(amount) * 1e9); // Convert SOL to lamports
    const estimatedFee = 5000; // ~5000 lamports for simple transfer

    return {
      success: true,
      gasEstimate: estimatedFee.toString(),
      totalCost: ((lamportsToSend + estimatedFee) / 1e9).toFixed(9),
      balanceAfter: "0", // Would need actual balance
    };
  } catch (error) {
    return {
      success: false,
      gasEstimate: "0",
      totalCost: "0",
      balanceAfter: "0",
      error: error instanceof Error ? error.message : "Simulation failed",
    };
  }
}
