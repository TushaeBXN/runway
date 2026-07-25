import { prisma } from "@/lib/prisma";

export const CONTRACTOR_THRESHOLD = 600; // IRS 1099-NEC reporting threshold

// Recalculate totalPaid + needs1099 flag after any payment change
export async function recalcContractor(contractorId: string) {
  const payments = await prisma.contractorPayment.findMany({ where: { contractorId } });
  const total = payments.reduce((s, p) => s + p.amount, 0);
  await prisma.contractor.update({
    where: { id: contractorId },
    data: { totalPaid: total, needs1099: total >= CONTRACTOR_THRESHOLD },
  });
}
