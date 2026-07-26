import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { BoardReportData } from "@/lib/boardReportData";

// ── Palette ──────────────────────────────────────────────────────
const C = {
  black:    "#1D1D1F",
  blue:     "#007AFF",
  green:    "#34C759",
  red:      "#FF3B30",
  orange:   "#FF9500",
  purple:   "#5856D6",
  gray1:    "#6E6E73",
  gray2:    "#8E8E93",
  gray3:    "#F5F5F7",
  gray4:    "#E5E5EA",
  white:    "#FFFFFF",
};

// ── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:          { fontFamily: "Helvetica", backgroundColor: C.white, paddingBottom: 40 },
  // Header
  header:        { backgroundColor: C.black, paddingHorizontal: 36, paddingVertical: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerLeft:    { flex: 1 },
  headerOrg:     { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 0.5 },
  headerTitle:   { fontSize: 11, color: "#A0A0A8", marginTop: 3, letterSpacing: 1.5 },
  headerRight:   { alignItems: "flex-end" },
  headerPeriod:  { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.white },
  headerDate:    { fontSize: 10, color: "#A0A0A8", marginTop: 3 },
  // Mission strip
  mission:       { backgroundColor: "#F7F7F8", paddingHorizontal: 36, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gray4 },
  missionText:   { fontSize: 9, color: C.gray1, fontFamily: "Helvetica-Oblique" },
  // Body
  body:          { paddingHorizontal: 36, paddingTop: 24 },
  // Summary cards
  cards:         { flexDirection: "row", marginBottom: 24 },
  card:          { flex: 1, backgroundColor: C.gray3, borderRadius: 8, padding: 14, marginRight: 10 },
  cardLast:      { flex: 1, backgroundColor: C.gray3, borderRadius: 8, padding: 14 },
  cardLabel:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gray2, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  cardValue:     { fontSize: 18, fontFamily: "Helvetica-Bold" },
  cardSub:       { fontSize: 8, color: C.gray2, marginTop: 4 },
  // Section header
  sectionBar:    { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 20 },
  sectionDot:    { width: 3, height: 14, borderRadius: 2, marginRight: 8 },
  sectionTitle:  { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black, letterSpacing: 0.8, textTransform: "uppercase" },
  // Table
  table:         { borderWidth: 1, borderColor: C.gray4, borderRadius: 6, overflow: "hidden" },
  tHead:         { flexDirection: "row", backgroundColor: C.gray3, paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.gray4 },
  tHeadCell:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gray1, textTransform: "uppercase", letterSpacing: 0.5 },
  tRow:          { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray3 },
  tRowAlt:       { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FAFAFA", borderBottomWidth: 1, borderBottomColor: C.gray3 },
  tRowLast:      { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8 },
  tCell:         { fontSize: 10, color: C.black },
  tCellRight:    { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black, textAlign: "right" },
  tCellGray:     { fontSize: 9, color: C.gray1 },
  // Two-column layout
  cols:          { flexDirection: "row" },
  col:           { flex: 1 },
  colRight:      { flex: 1, marginLeft: 16 },
  // Alert
  alert:         { backgroundColor: "#FFF2F2", borderWidth: 1, borderColor: "#FFCDD2", borderRadius: 6, padding: 12, marginBottom: 16, flexDirection: "row" },
  alertText:     { fontSize: 10, color: "#B71C1C", flex: 1 },
  // Status pill
  pillGreen:     { backgroundColor: "#E8F8EE", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pillRed:       { backgroundColor: "#FFE8E7", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pillOrange:    { backgroundColor: "#FFF3E0", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pillTextGreen: { fontSize: 8, color: "#1B7F3A", fontFamily: "Helvetica-Bold" },
  pillTextRed:   { fontSize: 8, color: "#C0392B", fontFamily: "Helvetica-Bold" },
  pillTextOrange:{ fontSize: 8, color: "#E65100", fontFamily: "Helvetica-Bold" },
  // Divider
  divider:       { height: 1, backgroundColor: C.gray4, marginVertical: 4 },
  // Total row
  totalRow:      { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, backgroundColor: C.gray3, borderTopWidth: 1.5, borderTopColor: C.gray4 },
  totalLabel:    { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black },
  totalValue:    { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right" },
  // Footer
  footer:        { position: "absolute", bottom: 18, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.gray4, paddingTop: 8 },
  footerText:    { fontSize: 8, color: C.gray2 },
});

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <View style={s.sectionBar}>
      <View style={[s.sectionDot, { backgroundColor: color }]} />
      <Text style={s.sectionTitle}>{label}</Text>
    </View>
  );
}

function TableRow({ cells, alt, isLast, rightFlex }: { cells: React.ReactNode[]; alt?: boolean; isLast?: boolean; rightFlex?: number }) {
  const rowStyle = isLast ? s.tRowLast : alt ? s.tRowAlt : s.tRow;
  return (
    <View style={rowStyle}>
      <View style={{ flex: 1 }}>{cells[0]}</View>
      <View style={{ flex: rightFlex ?? 0.45 }}>{cells[1]}</View>
    </View>
  );
}

// ── Document ─────────────────────────────────────────────────────
export function BoardReportPdf({ data }: { data: BoardReportData }) {
  const { financial, grants, contacts, operations, compliance, domains } = data;
  const orgName     = data.org?.name ?? "Our Organization";
  const hasAlerts   = compliance.overdueReminders > 0 || domains.expiringSoon.length > 0;
  const isProfit    = financial.netPosition >= 0;

  const grantRows = [
    ["Total Applications", String(grants.total), C.black],
    ...Object.entries(grants.byStatus).map(([st, n]) => [
      `  ${st.charAt(0).toUpperCase() + st.slice(1)}`,
      String(n),
      st === "awarded" ? C.green : st === "rejected" ? C.red : C.gray1,
    ]),
    ["TOTAL AWARDED", fmt(grants.awardedAmount), C.green],
  ];

  const contactRows = [
    ["Total Contacts", String(contacts.total), C.black],
    ...Object.entries(contacts.byType).map(([t, n]) => [
      `  ${t.charAt(0).toUpperCase() + t.slice(1)}s`,
      String(n),
      C.gray1,
    ]),
    ["Total Donated (all-time)", fmt(contacts.totalDonated), C.blue],
  ];

  const genDate = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <Document title={`${orgName} — Board Report ${data.reportPeriod}`} author="Runway">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerOrg}>{orgName}</Text>
            <Text style={s.headerTitle}>BOARD REPORT · FISCAL YEAR {data.reportPeriod}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerPeriod}>{data.reportPeriod}</Text>
            <Text style={s.headerDate}>Generated {genDate}</Text>
          </View>
        </View>

        {/* ── Mission strip ── */}
        {!!data.org?.mission && (
          <View style={s.mission}>
            <Text style={s.missionText}>Mission: {data.org.mission}</Text>
          </View>
        )}

        <View style={s.body}>

          {/* ── Alert banner ── */}
          {hasAlerts && (
            <View style={s.alert}>
              <Text style={s.alertText}>
                ⚠  Action Required: {[
                  compliance.overdueReminders > 0 && `${compliance.overdueReminders} compliance deadline${compliance.overdueReminders > 1 ? "s" : ""} overdue`,
                  ...domains.expiringSoon.map(d => `${d.name} expires in ${d.days} days`),
                ].filter(Boolean).join(" · ")}
              </Text>
            </View>
          )}

          {/* ── Summary cards ── */}
          <View style={s.cards}>
            {[
              { label: "Total Income",   value: fmt(financial.totalIncome),   color: C.blue   },
              { label: "Total Expenses", value: fmt(financial.totalExpenses),  color: C.purple },
              { label: isProfit ? "Surplus" : "Deficit", value: fmt(Math.abs(financial.netPosition)), color: isProfit ? C.green : C.red },
              { label: "Reserve Fund",   value: fmt(financial.reserveBalance), color: C.orange },
            ].map((card, i) => (
              <View key={card.label} style={[i === 3 ? s.cardLast : s.card, { borderTopWidth: 3, borderTopColor: card.color }]}>
                <Text style={s.cardLabel}>{card.label}</Text>
                <Text style={[s.cardValue, { color: card.color }]}>{card.value}</Text>
                {i === 2 && financial.totalIncome > 0 && (
                  <Text style={s.cardSub}>
                    {((financial.netPosition / financial.totalIncome) * 100).toFixed(1)}% margin
                  </Text>
                )}
                {i === 3 && financial.reserveTarget > 0 && (
                  <Text style={s.cardSub}>
                    of {fmt(financial.reserveTarget)} target
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* ── Two-column layout ── */}
          <View style={s.cols}>

            {/* LEFT COLUMN */}
            <View style={s.col}>

              {/* Financial Overview */}
              <SectionHeader label="Financial Overview" color={C.blue} />
              <View style={s.table}>
                <View style={s.tHead}>
                  <View style={{ flex: 1 }}><Text style={s.tHeadCell}>Line Item</Text></View>
                  <View style={{ flex: 0.45 }}><Text style={[s.tHeadCell, { textAlign: "right" }]}>Amount</Text></View>
                </View>
                {[
                  { label: "Gumroad Revenue",    value: fmt(financial.gumroadRevenue),  color: C.green,  indent: false },
                  { label: "Grant Awards",        value: fmt(financial.grantAwarded),    color: C.green,  indent: false },
                  { label: "Donations Received",  value: fmt(financial.donationTotal),   color: C.green,  indent: false },
                  { label: "Contractor Payments", value: fmt(financial.contractorSpend), color: C.red,    indent: false },
                  { label: "Staff Payroll",       value: fmt(financial.payrollTotal),    color: C.red,    indent: false },
                ].map((row, i, arr) => (
                  <TableRow
                    key={row.label}
                    alt={i % 2 !== 0}
                    isLast={i === arr.length - 1}
                    cells={[
                      <Text key="l" style={s.tCell}>{row.label}</Text>,
                      <Text key="v" style={[s.tCellRight, { color: row.color }]}>{row.value}</Text>,
                    ]}
                  />
                ))}
                <View style={s.totalRow}>
                  <View style={{ flex: 1 }}><Text style={s.totalLabel}>Net Position</Text></View>
                  <View style={{ flex: 0.45 }}>
                    <Text style={[s.totalValue, { color: isProfit ? C.green : C.red }]}>
                      {isProfit ? "+" : ""}{fmt(financial.netPosition)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Operations */}
              <SectionHeader label="Operations" color={C.purple} />
              <View style={s.table}>
                {[
                  ["Total Hours Logged", `${operations.totalHours.toFixed(1)}h`, C.black],
                  ["  Staff Hours",      `${operations.staffHours.toFixed(1)}h`,    C.gray1],
                  ["  Volunteer Hours",  `${operations.volunteerHours.toFixed(1)}h`, C.orange],
                  ["Payroll Estimate",   fmt(operations.payrollTotal), C.black],
                ].map(([label, value, color], i, arr) => (
                  <TableRow
                    key={label}
                    alt={i % 2 !== 0}
                    isLast={i === arr.length - 1}
                    cells={[
                      <Text key="l" style={s.tCell}>{label}</Text>,
                      <Text key="v" style={[s.tCellRight, { color }]}>{value}</Text>,
                    ]}
                  />
                ))}
              </View>

            </View>

            {/* RIGHT COLUMN */}
            <View style={s.colRight}>

              {/* Grants Pipeline */}
              <SectionHeader label="Grants Pipeline" color={C.green} />
              <View style={s.table}>
                {grantRows.map(([label, value, color], i, arr) => (
                  <TableRow
                    key={label}
                    alt={i % 2 !== 0}
                    isLast={i === arr.length - 1}
                    cells={[
                      <Text key="l" style={i === arr.length - 1 ? [s.totalLabel, { fontSize: 10 }] : s.tCell}>{label}</Text>,
                      <Text key="v" style={[s.tCellRight, { color }]}>{value}</Text>,
                    ]}
                  />
                ))}
              </View>

              {/* Donors & Contacts */}
              <SectionHeader label="Donors &amp; Contacts" color={C.blue} />
              <View style={s.table}>
                {contactRows.map(([label, value, color], i, arr) => (
                  <TableRow
                    key={label}
                    alt={i % 2 !== 0}
                    isLast={i === arr.length - 1}
                    cells={[
                      <Text key="l" style={s.tCell}>{label}</Text>,
                      <Text key="v" style={[s.tCellRight, { color }]}>{value}</Text>,
                    ]}
                  />
                ))}
              </View>

              {/* Compliance */}
              <SectionHeader label="Compliance" color={compliance.overdueReminders > 0 ? C.red : C.green} />
              <View style={s.table}>
                <TableRow alt={false} cells={[
                  <Text key="l" style={s.tCell}>Total Reminders</Text>,
                  <Text key="v" style={s.tCellRight}>{compliance.totalReminders}</Text>,
                ]} />
                <TableRow alt={true} cells={[
                  <Text key="l" style={s.tCell}>Overdue</Text>,
                  <Text key="v" style={[s.tCellRight, { color: compliance.overdueReminders > 0 ? C.red : C.green }]}>
                    {compliance.overdueReminders}
                  </Text>,
                ]} />
                <TableRow alt={false} cells={[
                  <Text key="l" style={s.tCell}>Due in 90 days</Text>,
                  <Text key="v" style={[s.tCellRight, { color: compliance.upcomingDeadlines.length > 0 ? C.orange : C.black }]}>
                    {compliance.upcomingDeadlines.length}
                  </Text>,
                ]} />
                {compliance.upcomingDeadlines.slice(0, 3).map((r, i, arr) => (
                  <TableRow key={r.label} alt={i % 2 !== 0} isLast={i === arr.length - 1} cells={[
                    <Text key="l" style={s.tCellGray}>  • {r.label}</Text>,
                    <Text key="v" style={[s.tCellRight, { color: C.gray1, fontSize: 9 }]}>{r.dueDate}</Text>,
                  ]} />
                ))}
              </View>

              {/* Domains */}
              <SectionHeader label="Domains" color={domains.expiringSoon.length > 0 ? C.orange : C.green} />
              <View style={s.table}>
                <TableRow alt={false} cells={[
                  <Text key="l" style={s.tCell}>Total Domains</Text>,
                  <Text key="v" style={s.tCellRight}>{domains.total}</Text>,
                ]} />
                {domains.expiringSoon.length === 0 ? (
                  <TableRow alt={true} isLast cells={[
                    <Text key="l" style={[s.tCell, { color: C.green }]}>✓ All safe (&gt; 60 days)</Text>,
                    <Text key="v" style={s.tCellRight} />,
                  ]} />
                ) : domains.expiringSoon.map((d, i, arr) => (
                  <TableRow key={d.name} alt={i % 2 !== 0} isLast={i === arr.length - 1} cells={[
                    <Text key="l" style={[s.tCell, { color: d.days < 14 ? C.red : C.orange }]}>{d.name}</Text>,
                    <Text key="v" style={[s.tCellRight, { color: d.days < 14 ? C.red : C.orange }]}>{d.days}d</Text>,
                  ]} />
                ))}
              </View>

            </View>
          </View>

          {/* ── Action Items strip ── */}
          {(data.pendingApprovals > 0 || data.inboxPending > 0) && (
            <>
              <SectionHeader label="Action Items" color={C.orange} />
              <View style={[s.table, { marginBottom: 0 }]}>
                {data.pendingApprovals > 0 && (
                  <TableRow alt={false} cells={[
                    <Text key="l" style={s.tCell}>Pending Approvals</Text>,
                    <Text key="v" style={[s.tCellRight, { color: C.orange }]}>{data.pendingApprovals}</Text>,
                  ]} />
                )}
                {data.inboxPending > 0 && (
                  <TableRow alt={data.pendingApprovals > 0} isLast cells={[
                    <Text key="l" style={s.tCell}>Inbox (unread)</Text>,
                    <Text key="v" style={[s.tCellRight, { color: C.blue }]}>{data.inboxPending}</Text>,
                  ]} />
                )}
              </View>
            </>
          )}

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Runway · {orgName} · {data.reportPeriod} Board Report</Text>
          <Text style={s.footerText}>Generated {genDate} · Confidential</Text>
        </View>

      </Page>
    </Document>
  );
}
