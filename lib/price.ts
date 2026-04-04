/**
 * Token price feed — CoinGecko free API (no key required)
 * In-memory cache: 60 seconds to avoid rate limits
 */

interface PriceCache {
  eth: number;
  sol: number;
  fetchedAt: number;
}

let cache: PriceCache | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchPrices(): Promise<{ eth: number; sol: number }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana&vs_currencies=usd",
    { next: { revalidate: 60 } }
  );

  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const data = await res.json();
  return {
    eth: data?.ethereum?.usd ?? 0,
    sol: data?.solana?.usd ?? 0,
  };
}

export async function getTokenPriceUSD(token: "ETH" | "SOL"): Promise<number> {
  const now = Date.now();

  if (!cache || now - cache.fetchedAt > CACHE_TTL_MS) {
    try {
      const prices = await fetchPrices();
      cache = { ...prices, fetchedAt: now };
    } catch {
      // Return last cached value on failure, or 0
      return token === "ETH" ? (cache?.eth ?? 0) : (cache?.sol ?? 0);
    }
  }

  return token === "ETH" ? cache!.eth : cache!.sol;
}

export async function toUSD(amount: string, token: "ETH" | "SOL"): Promise<number> {
  const price = await getTokenPriceUSD(token);
  return parseFloat(amount) * price;
}
