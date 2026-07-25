// QuickBooks Online OAuth 2.0 + API helpers
// Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor

export const QB_BASE_URL = "https://appcenter.intuit.com/connect/oauth2";
export const QB_API_BASE = "https://quickbooks.api.intuit.com/v3";
export const QB_SANDBOX_API_BASE = "https://sandbox-quickbooks.api.intuit.com/v3";

export interface QBTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;     // seconds
  x_refresh_token_expires_in: number;
  token_type: string;
  realmId: string;        // QuickBooks company ID
  obtainedAt: number;     // Date.now() when tokens were fetched
}

export function buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  return `${QB_BASE_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string, clientId: string, clientSecret: string): Promise<QBTokens & { realmId: string }> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`QB token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return { ...data, obtainedAt: Date.now() };
}

export async function refreshTokens(tokens: QBTokens, clientId: string, clientSecret: string): Promise<QBTokens> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token }),
  });
  if (!res.ok) throw new Error(`QB refresh failed: ${await res.text()}`);
  const data = await res.json();
  return { ...data, realmId: tokens.realmId, obtainedAt: Date.now() };
}

export function isExpired(tokens: QBTokens): boolean {
  const expiresAt = tokens.obtainedAt + (tokens.expires_in - 60) * 1000; // 60s buffer
  return Date.now() >= expiresAt;
}

export async function qbQuery(tokens: QBTokens, query: string, sandbox = false): Promise<unknown> {
  const base = sandbox ? QB_SANDBOX_API_BASE : QB_API_BASE;
  const res = await fetch(`${base}/company/${tokens.realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`QB query failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// Extract vendors (contractors) from QB response
export function parseVendors(data: unknown): Array<{ name: string; email: string | null; ein: string | null; displayName: string }> {
  const rows = (data as { QueryResponse?: { Vendor?: unknown[] } })?.QueryResponse?.Vendor ?? [];
  return rows.map((v: unknown) => {
    const vendor = v as Record<string, unknown>;
    return {
      name: String(vendor.DisplayName ?? vendor.PrintOnCheckName ?? ""),
      displayName: String(vendor.DisplayName ?? ""),
      email: String((vendor.PrimaryEmailAddr as Record<string, unknown>)?.Address ?? "") || null,
      ein: String(vendor.TaxIdentifier ?? "") || null,
    };
  });
}

// Extract vendor payments from QB Purchases response
export function parsePayments(data: unknown): Array<{ vendorName: string; amount: number; date: string; description: string }> {
  const rows = (data as { QueryResponse?: { Purchase?: unknown[] } })?.QueryResponse?.Purchase ?? [];
  return rows.map((p: unknown) => {
    const purchase = p as Record<string, unknown>;
    const entityRef = purchase.EntityRef as Record<string, unknown> | undefined;
    return {
      vendorName: String(entityRef?.name ?? ""),
      amount: parseFloat(String(purchase.TotalAmt ?? 0)),
      date: String(purchase.TxnDate ?? ""),
      description: String((purchase.PrivateNote ?? purchase.Memo) ?? "QB Import"),
    };
  });
}
