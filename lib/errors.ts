/**
 * Maps raw technical error messages to user-friendly text.
 */
export function friendlyError(raw: string): string {
  const r = raw.toLowerCase();

  if (r.includes("insufficient funds") || r.includes("insufficient balance") || r.includes("exceeds balance"))
    return "Yetersiz bakiye. Faucet'ten test ETH/SOL alın.";

  if (r.includes("not found in vault") || r.includes("wallet") && r.includes("not found"))
    return "Cüzdan bulunamadı. Önce bir cüzdan oluşturun.";

  if (r.includes("policy settings unavailable") || r.includes("db unreachable"))
    return "Güvenlik servisi şu an erişilemiyor. Lütfen tekrar deneyin.";

  if (r.includes("nonce") || r.includes("replacement transaction") || r.includes("already known"))
    return "İşlem çakışması. Birkaç saniye bekleyip tekrar deneyin.";

  if (r.includes("gas") && (r.includes("estimate") || r.includes("limit")))
    return "Gas tahmini başarısız. RPC bağlantısını kontrol edin.";

  if (r.includes("invalid address") || r.includes("checksum") || r.includes("address format"))
    return "Geçersiz adres. Adresi kontrol edip tekrar deneyin.";

  if (r.includes("network") || r.includes("econnrefused") || r.includes("timeout") || r.includes("fetch failed"))
    return "Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.";

  if (r.includes("unauthorized") || r.includes("401"))
    return "Oturum süresi dolmuş. Sayfayı yenileyip tekrar giriş yapın.";

  if (r.includes("requires user approval"))
    return "İşlem kullanıcı onayı bekliyor.";

  if (r.includes("testnet") || r.includes("mainnet not allowed"))
    return "Yalnızca testnet işlemlerine izin veriliyor (Sepolia / Devnet).";

  if (r.includes("whitelist"))
    return "Alıcı adres beyaz listede değil. Policy panelinden ekleyebilirsiniz.";

  if (r.includes("spending limit") || r.includes("daily limit"))
    return "Günlük harcama limitine ulaşıldı. Policy panelinden limiti güncelleyebilirsiniz.";

  if (r.includes("velocity") || r.includes("frequency"))
    return "İşlem sıklığı limitine ulaşıldı. Biraz bekleyip tekrar deneyin.";

  return "Bir hata oluştu. Lütfen tekrar deneyin.";
}
