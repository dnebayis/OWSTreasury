"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AUTH_KEY = "ows_auth";
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    if (stored === "1") setAuthenticated(true);
    setChecking(false);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setAttempts(0);
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil) return;

    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthenticated(true);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        setError(`${MAX_ATTEMPTS} hatalı deneme. ${LOCKOUT_SECONDS} saniye bekleyin.`);
      } else {
        setError(`Hatalı şifre. ${MAX_ATTEMPTS - newAttempts} deneme hakkınız kaldı.`);
      }
      setPassword("");
      inputRef.current?.focus();
    }
  };

  if (checking) return null;
  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/30 to-blue-500/20 blur-sm" />
            <div className="relative h-12 w-12 rounded-xl border border-border/60 bg-card flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold tracking-tight">OWS Treasury</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Erişim şifresi gerekiyor</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              placeholder="Şifre"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              disabled={!!lockedUntil}
              className="pr-10 bg-card/40 border-border/60"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-400 text-center">
              {lockedUntil ? `Kilitli — ${countdown}s` : error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!password || !!lockedUntil}
          >
            {lockedUntil ? `${countdown}s bekleyin` : "Giriş"}
          </Button>
        </form>
      </div>
    </div>
  );
}
