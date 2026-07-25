"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Fund {
  id: string; label: string; balance: number; targetAmount: number; autoAllocatePct: number;
}
interface Transaction {
  id: string; amount: number; type: string; source: string; description?: string; createdAt: string;
}
interface Sale {
  id: string; productName: string; amount: number; fee: number; net: number; email?: string; createdAt: string;
}

export default function ReserveFundPage() {
  const { status } = useSession();
  const router = useRouter();
  const [fund, setFund] = useState<Fund | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [gumroadTotal, setGumroadTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [label, setLabel] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [autoAllocatePct, setAutoAllocatePct] = useState("20");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Gumroad connect
  const [sellerId, setSellerId] = useState("");
  const [connectingSeller, setConnectingSeller] = useState(false);
  const [sellerConnected, setSellerConnected] = useState(false);

  // Manual transactions
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txSaving, setTxSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reserve-fund");
    const d = await res.json();
    setFund(d.fund);
    setTransactions(d.transactions);
    setSales(d.sales);
    setGumroadTotal(d.gumroadTotal);
    setLabel(d.fund.label);
    setTargetAmount(String(d.fund.targetAmount || ""));
    setAutoAllocatePct(String(d.fund.autoAllocatePct || 20));
    setLoading(false);
  }

  async function saveSettings() {
    setSettingsSaving(true);
    await fetch("/api/reserve-fund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_settings", label, targetAmount: parseFloat(targetAmount) || 0, autoAllocatePct: parseFloat(autoAllocatePct) || 20 }) });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    setSettingsSaving(false);
    load();
  }

  async function connectGumroad() {
    if (!sellerId.trim()) return;
    setConnectingSeller(true);
    await fetch("/api/reserve-fund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect_gumroad", sellerId: sellerId.trim() }) });
    setSellerConnected(true);
    setConnectingSeller(false);
    setSellerId("");
    setTimeout(() => setSellerConnected(false), 4000);
  }

  async function doTransaction(type: "manual_deposit" | "withdrawal") {
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0) return;
    setTxSaving(true);
    const res = await fetch("/api/reserve-fund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: type, amount, description: txNote }) });
    const d = await res.json();
    if (!d.ok) { alert(d.error); }
    setTxAmount(""); setTxNote("");
    setShowDeposit(false); setShowWithdrawal(false);
    setTxSaving(false);
    load();
  }

  if (status === "loading" || loading || !fund) return <div style={{ padding: 24, color: "#8E8E93" }}>Loading…</div>;

  const pct = fund.targetAmount > 0 ? Math.min(100, Math.round((fund.balance / fund.targetAmount) * 100)) : 0;
  const barColor = pct >= 100 ? "#34C759" : pct >= 60 ? "#007AFF" : pct >= 30 ? "#FF9500" : "#FF3B30";

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.5px" }}>{fund.label}</h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>Auto-allocates a percentage of Gumroad digital product sales to cover compliance costs.</p>
      </div>

      {/* Balance card */}
      <div style={{ background: "linear-gradient(135deg, #1D1D1F, #3D3D3F)", borderRadius: 20, padding: "28px 28px 24px", marginBottom: 20, color: "#fff" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Current Balance</p>
        <p style={{ fontSize: 44, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-1px" }}>
          ${fund.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {fund.targetAmount > 0 && (
          <>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 8, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              <span>{pct}% of ${fund.targetAmount.toLocaleString()} target</span>
              <span>${(fund.targetAmount - fund.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })} remaining</span>
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => { setShowDeposit(true); setShowWithdrawal(false); }}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Deposit
          </button>
          <button onClick={() => { setShowWithdrawal(true); setShowDeposit(false); }}
            style={{ background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Withdraw
          </button>
        </div>
      </div>

      {/* Manual transaction form */}
      {(showDeposit || showWithdrawal) && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>{showDeposit ? "Manual Deposit" : "Withdrawal"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Amount *</p>
              <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00"
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Note</p>
              <input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder={showDeposit ? "e.g. Monthly transfer from checking" : "e.g. CA Statement of Information fee"}
                style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => doTransaction(showDeposit ? "manual_deposit" : "withdrawal")} disabled={!txAmount || txSaving}
              style={{ background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {txSaving ? "Saving…" : showDeposit ? "Deposit" : "Withdraw"}
            </button>
            <button onClick={() => { setShowDeposit(false); setShowWithdrawal(false); setTxAmount(""); setTxNote(""); }}
              style={{ background: "transparent", border: "none", color: "#8E8E93", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Gumroad Revenue", value: `$${gumroadTotal.toFixed(2)}`, icon: "🛍" },
          { label: `Auto-Allocate (${fund.autoAllocatePct}% of net)`, value: `~$${(gumroadTotal * (fund.autoAllocatePct / 100)).toFixed(2)}`, icon: "⚙️" },
          { label: "Total Sales Logged", value: sales.length, icon: "📦" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1D1D1F" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Recent transactions */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8E8E93" }}>No transactions yet. Gumroad sales auto-deposit here.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {transactions.map((tx) => (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F5F5F7" }}>
                  <span style={{ fontSize: 16 }}>{tx.source === "gumroad" ? "🛍" : tx.type === "deposit" ? "💵" : "📤"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#1D1D1F", fontWeight: 600 }}>{tx.description ?? tx.type}</div>
                    <div style={{ fontSize: 11, color: "#8E8E93" }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tx.type === "withdrawal" ? "#FF3B30" : "#34C759" }}>
                    {tx.type === "withdrawal" ? "−" : "+"}${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings + Gumroad connect */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Gumroad connection */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 6px" }}>Connect Gumroad</h2>
            <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 14px", lineHeight: 1.5 }}>
              Enter your Gumroad Seller ID, then add this webhook URL to your Gumroad Ping settings:
              <code style={{ display: "block", background: "#F5F5F7", borderRadius: 6, padding: "6px 10px", fontSize: 11, marginTop: 6, wordBreak: "break-all" }}>
                {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/webhooks/gumroad
              </code>
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Gumroad Seller ID</p>
            <input value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="Found in Gumroad Settings → Advanced"
              style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
            <button onClick={connectGumroad} disabled={!sellerId.trim() || connectingSeller}
              style={{ background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {connectingSeller ? "Saving…" : sellerConnected ? "✓ Connected!" : "Connect Gumroad"}
            </button>
          </div>

          {/* Fund settings */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>Fund Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Fund Name</p>
                <input value={label} onChange={(e) => setLabel(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Target Amount ($)</p>
                <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="e.g. 2000"
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 5px" }}>Auto-Allocate % of Gumroad Net</p>
                <input type="number" min="0" max="100" value={autoAllocatePct} onChange={(e) => setAutoAllocatePct(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #E5E5EA", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 4 }}>Each Gumroad sale automatically deposits {autoAllocatePct || 20}% of net into this fund</p>
              </div>
              <button onClick={saveSettings} disabled={settingsSaving}
                style={{ background: settingsSaved ? "#34C759" : "#1D1D1F", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {settingsSaving ? "Saving…" : settingsSaved ? "✓ Saved!" : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Gumroad sales */}
      {sales.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginTop: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 14px" }}>Recent Gumroad Sales</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sales.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #F5F5F7" }}>
                <span style={{ fontSize: 16 }}>🛍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{s.productName}</div>
                  <div style={{ fontSize: 11, color: "#8E8E93" }}>{s.email ?? "buyer"} · {new Date(s.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#34C759" }}>+${s.net.toFixed(2)} net</div>
                  <div style={{ fontSize: 11, color: "#8E8E93" }}>${s.amount.toFixed(2)} − ${s.fee.toFixed(2)} fee</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
