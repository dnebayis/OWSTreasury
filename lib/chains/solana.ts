import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmRawTransaction,
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

/**
 * Build an unsigned Solana SOL transfer transaction.
 * Returns the Transaction object and its base64-serialized form for OWS signing.
 */
export async function buildUnsignedSolanaTransaction(params: {
  from: string;
  to: string;
  amount: string; // in SOL
}): Promise<{ transaction: Transaction; serializedBase64: string }> {
  const { from, to, amount } = params;

  const fromPubkey = new PublicKey(from);
  const toPubkey = new PublicKey(to);
  const lamports = Math.floor(parseFloat(amount) * 1e9);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  }).add(
    SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
  );

  // Serialize without signature — OWS will sign the message bytes
  const serializedBase64 = transaction.serializeMessage().toString("base64");

  return { transaction, serializedBase64 };
}

/**
 * Attach OWS signature to a Solana transaction and broadcast it.
 * OWS returns a 64-byte Ed25519 signature as hex (128 hex chars).
 * Returns the transaction signature string (base58).
 */
export async function broadcastSolanaTransaction(
  transaction: Transaction,
  signatureHex: string
): Promise<string> {
  const clean = signatureHex.startsWith("0x") ? signatureHex.slice(2) : signatureHex;

  if (clean.length !== 128) {
    throw new Error(`Unexpected Solana signature length: ${clean.length} chars (expected 128)`);
  }

  const sigBytes = Buffer.from(clean, "hex");

  // Add signature to the transaction
  const feePayer = transaction.feePayer!;
  transaction.addSignature(feePayer, sigBytes);

  const rawTx = transaction.serialize();
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}
