"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

interface Wallet {
  name: string;
  addresses: Array<{ chain: string; address: string }>;
  createdAt: string;
}

export default function Dashboard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const response = await fetch("/api/wallet/list");
        if (!response.ok) throw new Error("Failed to fetch wallets");
        const data = await response.json();
        setWallets(data.wallets || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Wallet Dashboard</h1>
            <p className="text-sm text-slate-500">View and manage your wallets</p>
          </div>
          <Link href="/">
            <Button>← Back to Chat</Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        ) : wallets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-slate-500">
              <p>No wallets found. Create one using the chat interface.</p>
              <Link href="/" className="mt-4 inline-block">
                <Button>Go to Chat</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wallets.map((wallet) => (
              <Card key={wallet.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{wallet.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700">Addresses</h3>
                    {wallet.addresses.map((addr) => (
                      <div
                        key={addr.chain}
                        className="bg-slate-50 rounded p-2 text-xs"
                      >
                        <div className="text-slate-600 capitalize font-semibold">
                          {addr.chain}
                        </div>
                        <div className="font-mono text-slate-900 truncate">
                          {addr.address}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center text-xs text-slate-500">
                    <Clock className="w-3 h-3 mr-1" />
                    Created {new Date(wallet.createdAt).toLocaleDateString()}
                  </div>

                  <Button className="w-full" size="sm" variant="outline">
                    View Details <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
