// POST /api/integrations/quickbooks/sync
// Pulls vendors + vendor payments from QB, creates/updates Contractor records,
// and adds ContractorPayment entries for any new transactions.
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QBTokens, qbQuery, refreshTokens, isExpired, parseVendors, parsePayments } from "@/lib/quickbooks";
import { recalcContractor } from "@/lib/contractorUtils";

const CLIENT_ID     = process.env.QB_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.QB_CLIENT_SECRET ?? "";
const TAX_YEAR      = new Date().getFullYear();
const SANDBOX       = process.env.QB_SANDBOX === "true";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const svc = await prisma.connectedService.findFirst({ where: { userId, service: "quickbooks", isActive: true } });
  if (!svc) return NextResponse.json({ error: "QuickBooks not connected" }, { status: 400 });

  let tokens: QBTokens = JSON.parse(svc.credentials);

  // Refresh token if expired
  if (isExpired(tokens)) {
    tokens = await refreshTokens(tokens, CLIENT_ID, CLIENT_SECRET);
    await prisma.connectedService.update({ where: { id: svc.id }, data: { credentials: JSON.stringify(tokens) } });
  }

  // Fetch vendors (only those that are 1099-eligible)
  const vendorData  = await qbQuery(tokens, "SELECT * FROM Vendor WHERE Vendor1099 = true MAXRESULTS 200", SANDBOX);
  const vendors     = parseVendors(vendorData);

  // Fetch vendor purchases for current tax year
  const startDate   = `${TAX_YEAR}-01-01`;
  const endDate     = `${TAX_YEAR}-12-31`;
  const paymentData = await qbQuery(tokens, `SELECT * FROM Purchase WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`, SANDBOX);
  const payments    = parsePayments(paymentData);

  let contractorsCreated = 0;
  let paymentsImported   = 0;
  const errors: string[] = [];

  for (const vendor of vendors) {
    if (!vendor.name) continue;
    try {
      // Upsert contractor (match by name — QB doesn't expose a stable unique ID without full access)
      let contractor = await prisma.contractor.findFirst({ where: { userId, name: vendor.name, taxYear: TAX_YEAR, isActive: true } });
      if (!contractor) {
        contractor = await prisma.contractor.create({
          data: { userId, name: vendor.name, email: vendor.email, ein: vendor.ein, taxYear: TAX_YEAR, totalPaid: 0, notes: "Imported from QuickBooks" },
        });
        contractorsCreated++;
      }

      // Import payments for this vendor
      const vendorPayments = payments.filter((p) => p.vendorName === vendor.name || p.vendorName === vendor.displayName);
      for (const pay of vendorPayments) {
        if (!pay.amount || pay.amount <= 0) continue;
        const paidOn = new Date(pay.date);
        if (isNaN(paidOn.getTime())) continue;

        // Skip if already imported (match by contractor + amount + date)
        const exists = await prisma.contractorPayment.findFirst({
          where: { contractorId: contractor.id, amount: pay.amount, paidOn },
        });
        if (exists) continue;

        await prisma.contractorPayment.create({
          data: { contractorId: contractor.id, userId, amount: pay.amount, paidOn, description: pay.description, method: "QB Import" },
        });
        paymentsImported++;
      }

      await recalcContractor(contractor.id);
    } catch (err) {
      errors.push(`${vendor.name}: ${String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, contractorsCreated, paymentsImported, vendorCount: vendors.length, errors });
}
