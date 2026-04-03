import { createPublicClient, http, formatEther, parseEther, serializeTransaction } from "viem";
import { sepolia } from "viem/chains";

/**
 * EVM (Ethereum Sepolia) helpers using viem
 */

const evmClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
});

export async function getEVMBalance(
  address: string,
  tokenAddress?: string
): Promise<{
  balance: string;
  token: string;
  decimals: number;
}> {
  try {
    if (tokenAddress) {
      // Get ERC-20 token balance
      return {
        balance: "0", // Would need to call token contract
        token: "ERC-20",
        decimals: 18,
      };
    }

    // Get native ETH balance
    const balance = await evmClient.getBalance({ address: address as `0x${string}` });

    return {
      balance: formatEther(balance),
      token: "ETH",
      decimals: 18,
    };
  } catch (error) {
    throw new Error(`Failed to get EVM balance: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function simulateEVMTransaction(params: {
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
    // Simulate transaction
    const gasEstimate = BigInt(21000); // Standard ETH transfer
    const gasPrice = BigInt(50 * 1e9); // 50 gwei (estimate)
    const totalGasCost = gasEstimate * gasPrice;

    return {
      success: true,
      gasEstimate: gasEstimate.toString(),
      totalCost: formatEther(totalGasCost), // e.g. "0.00000105"
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
 * Build an unsigned legacy EVM transaction ready for OWS signing.
 * Returns the transaction object and its RLP-serialized hex.
 */
export async function buildUnsignedEVMTransaction(params: {
  from: `0x${string}`;
  to: string;
  amount: string;
}): Promise<{ unsignedTx: Parameters<typeof serializeTransaction>[0]; serializedHex: `0x${string}` }> {
  const { from, to, amount } = params;

  const [nonce, gasPrice] = await Promise.all([
    evmClient.getTransactionCount({ address: from }),
    evmClient.getGasPrice(),
  ]);

  const unsignedTx = {
    nonce,
    gasPrice,
    gas: BigInt(21000),
    to: to as `0x${string}`,
    value: parseEther(amount),
    chainId: sepolia.id,
  };

  const serializedHex = serializeTransaction(unsignedTx);
  return { unsignedTx, serializedHex };
}

/**
 * Attach a 65-byte raw signature from OWS and broadcast the signed transaction.
 * OWS returns: r (32 bytes) + s (32 bytes) + v (1 byte) = 65 bytes = 130 hex chars.
 * Returns the tx hash.
 */
export async function broadcastEVMTransaction(
  unsignedTx: Parameters<typeof serializeTransaction>[0],
  signatureHex: string
): Promise<string> {
  const clean = signatureHex.startsWith("0x") ? signatureHex.slice(2) : signatureHex;

  if (clean.length !== 130) {
    throw new Error(`Unexpected OWS signature length: ${clean.length} chars (expected 130)`);
  }

  const r = `0x${clean.slice(0, 64)}` as `0x${string}`;
  const s = `0x${clean.slice(64, 128)}` as `0x${string}`;
  const vRaw = parseInt(clean.slice(128, 130), 16);

  // viem's serializeTransaction expects v as BigInt (27n or 28n for legacy).
  // OWS may return recovery param as 0/1 or 27/28 — normalize to 27n/28n.
  const v = vRaw === 0 || vRaw === 27 ? 27n : 28n;

  const signedTx = serializeTransaction(unsignedTx, { r, s, v });
  const hash = await evmClient.sendRawTransaction({ serializedTransaction: signedTx });
  return hash;
}
