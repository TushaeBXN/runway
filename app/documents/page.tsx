"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
}

interface MarketResearchContent {
  businessOverview?: string;
  marketAnalysis?: {
    marketSize?: string;
    growthDrivers?: string[];
    segments?: string[];
  };
  competitiveLandscape?: {
    competitors?: { name: string; focus: string; pricing: string; differentiator: string }[];
    keyInsight?: string;
  };
  aiLeveragePoints?: string[];
  firstPriorities?: { title: string; description: string; category: string }[];
  summary?: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  market_research: { bg: "#E8F4FD", text: "#0A7ABD", label: "Market Research" },
  mission: { bg: "#F0E8FD", text: "#7A0ABD", label: "Mission" },
  strategy: { bg: "#E8FDF0", text: "#0ABD4B", label: "Strategy" },
};

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || { bg: "#F0F0F5", text: "#555580", label: type };
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {c.label}
    </span>
  );
}

function MarketResearchView({ content }: { content: MarketResearchContent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {content.summary && (
        <div
          style={{
            background: "#F5F5F7",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>
            {content.summary}
          </p>
        </div>
      )}

      {content.businessOverview && (
        <Section title="Business Overview">
          <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>
            {content.businessOverview}
          </p>
        </Section>
      )}

      {content.marketAnalysis && (
        <Section title="Market Analysis">
          {content.marketAnalysis.marketSize && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#8E8E93", fontWeight: 600 }}>MARKET SIZE</span>
              <p style={{ fontSize: 14, color: "#1D1D1F", margin: "4px 0 0" }}>
                {content.marketAnalysis.marketSize}
              </p>
            </div>
          )}
          {content.marketAnalysis.growthDrivers && content.marketAnalysis.growthDrivers.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#8E8E93", fontWeight: 600 }}>GROWTH DRIVERS</span>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {content.marketAnalysis.growthDrivers.map((d, i) => (
                  <li key={i} style={{ fontSize: 14, color: "#1D1D1F", marginBottom: 4 }}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {content.marketAnalysis.segments && content.marketAnalysis.segments.length > 0 && (
            <div>
              <span style={{ fontSize: 12, color: "#8E8E93", fontWeight: 600 }}>SEGMENTS</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {content.marketAnalysis.segments.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      background: "#F0F0F5",
                      color: "#1D1D1F",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {content.competitiveLandscape && (
        <Section title="Competitive Landscape">
          {content.competitiveLandscape.keyInsight && (
            <p style={{ fontSize: 14, color: "#6E6E73", lineHeight: 1.5, marginBottom: 12 }}>
              {content.competitiveLandscape.keyInsight}
            </p>
          )}
          {content.competitiveLandscape.competitors && content.competitiveLandscape.competitors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {content.competitiveLandscape.competitors.map((comp, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #E5E5EA",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 4px" }}>
                    {comp.name}
                  </p>
                  <p style={{ fontSize: 13, color: "#6E6E73", margin: "0 0 4px" }}>{comp.focus}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#8E8E93" }}>Pricing: {comp.pricing}</span>
                    <span style={{ fontSize: 12, color: "#8E8E93" }}>Edge: {comp.differentiator}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {content.aiLeveragePoints && content.aiLeveragePoints.length > 0 && (
        <Section title="AI Leverage Points">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {content.aiLeveragePoints.map((p, i) => (
              <li key={i} style={{ fontSize: 14, color: "#1D1D1F", marginBottom: 6, lineHeight: 1.5 }}>{p}</li>
            ))}
          </ul>
        </Section>
      )}

      {content.firstPriorities && content.firstPriorities.length > 0 && (
        <Section title="First Priorities">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.firstPriorities.map((p, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #E5E5EA",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#C7C7CC",
                    lineHeight: 1,
                    minWidth: 24,
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: "0 0 4px" }}>
                    {p.title}
                  </p>
                  <p style={{ fontSize: 13, color: "#6E6E73", margin: 0 }}>{p.description}</p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      background: "#F0F0F5",
                      color: "#555580",
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {p.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#8E8E93",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 10,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/documents")
        .then((r) => r.json())
        .then((json) => setDocuments(json.documents || []))
        .catch(() => setDocuments([]))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div style={{ padding: "48px 24px", color: "#8E8E93" }}>Loading…</div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1D1D1F",
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          Documents
        </h1>
        <p style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>
          Research reports and strategic documents generated by your agents.
        </p>
        <button
          onClick={async () => {
            setGenerating(true);
            setGenMessage("");
            const res = await fetch("/api/documents/research", { method: "POST" });
            const data = await res.json();
            setGenMessage(data.message || data.error || "Started!");
            setGenerating(false);
            // Refresh documents after 40 seconds
            setTimeout(() => {
              fetch("/api/documents")
                .then(r => r.ok ? r.json() : null)
                .then(json => json && setDocuments(json.documents || []))
                .catch(() => {});
            }, 40000);
          }}
          disabled={generating}
          style={{
            marginTop: 12,
            background: generating ? "#8E8E93" : "#1D1D1F",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "Researching…" : "⚡ Run Market Research"}
        </button>
        {genMessage && (
          <p style={{ fontSize: 13, color: "#34C759", marginTop: 8 }}>{genMessage}</p>
        )}
      </div>

      {documents.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E5EA",
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#8E8E93", fontSize: 15, marginBottom: 8 }}>
            No documents yet
          </p>
          <p style={{ color: "#C7C7CC", fontSize: 13 }}>
            Documents will appear here after your agents complete research and analysis.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {documents.map((doc) => {
            const isExpanded = expandedId === doc.id;
            let parsed: MarketResearchContent | null = null;
            try {
              parsed = JSON.parse(doc.content);
            } catch {
              // ignore
            }

            return (
              <div
                key={doc.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E5E5EA",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <TypeBadge type={doc.type} />
                      <span style={{ fontSize: 12, color: "#C7C7CC" }}>
                        {new Date(doc.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#1D1D1F",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {doc.title}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      color: "#8E8E93",
                      flexShrink: 0,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      display: "inline-block",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 20px 20px",
                      borderTop: "1px solid #F0F0F5",
                      paddingTop: 20,
                    }}
                  >
                    {parsed && doc.type === "market_research" ? (
                      <MarketResearchView content={parsed} />
                    ) : (
                      <pre
                        style={{
                          fontSize: 13,
                          color: "#1D1D1F",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          margin: 0,
                          fontFamily: "inherit",
                          lineHeight: 1.6,
                        }}
                      >
                        {doc.content}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
