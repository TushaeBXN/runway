"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/documents", label: "Documents" },
  { href: "/agents", label: "Agents" },
  { href: "/grants", label: "Grants" },
  { href: "/upwork", label: "Upwork" },
  { href: "/compliance", label: "Compliance" },
  { href: "/contractors", label: "1099 Tracker" },
  { href: "/reserve-fund", label: "Reserve Fund" },
  { href: "/inbox", label: "Inbox" },
  { href: "/hardware-fund", label: "Hardware Fund" },
  { href: "/team", label: "Team" },
  { href: "/chat", label: "Chat" },
];

interface ProviderInfo {
  provider: string;
  model: string;
  status: string;
}

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/provider")
      .then((r) => r.json())
      .then(setProviderInfo)
      .catch(() => null);
  }, []);

  const isOllama = providerInfo?.provider === "ollama";
  const modelShort = providerInfo?.model?.split(":")[0] ?? "";

  const userInitial = session?.user?.name
    ? session.user.name[0].toUpperCase()
    : session?.user?.email
    ? session.user.email[0].toUpperCase()
    : "?";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "var(--nav-height)",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      {/* Left: wordmark + model badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href="/dashboard"
          style={{
            fontWeight: 600,
            fontSize: 17,
            color: "#1D1D1F",
            textDecoration: "none",
            letterSpacing: "-0.3px",
          }}
        >
          Runway
        </Link>
        {providerInfo && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6E6E73",
              background: "#F0F0F0",
              borderRadius: 6,
              padding: "2px 8px",
              letterSpacing: 0.2,
            }}
            title={`LLM: ${providerInfo.provider} / ${providerInfo.model}`}
          >
            {isOllama ? `⬡ ${modelShort}` : `◆ ${modelShort}`}
          </span>
        )}
      </div>

      {/* Center: nav links */}
      <div style={{ display: "flex", gap: 4 }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: pathname === l.href ? "#1D1D1F" : "#6E6E73",
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: 8,
              background: pathname === l.href ? "rgba(0,0,0,0.06)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right: user menu */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link
          href="/settings"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: pathname === "/settings" ? "#1D1D1F" : "#6E6E73",
            textDecoration: "none",
            padding: "5px 10px",
            borderRadius: 8,
            background: pathname === "/settings" ? "rgba(0,0,0,0.06)" : "transparent",
          }}
        >
          Settings
        </Link>

        {session?.user && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#1D1D1F",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: 0,
              }}
              title={session.user.email || ""}
            >
              {userInitial}
            </button>

            {userMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 99,
                  }}
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                    padding: "8px",
                    minWidth: 200,
                    zIndex: 200,
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {/* User info */}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #F0F0F0",
                      marginBottom: 4,
                    }}
                  >
                    {session.user.name && (
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>
                        {session.user.name}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: "#8E8E93" }}>{session.user.email}</p>
                  </div>

                  {/* Menu items */}
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      fontSize: 14,
                      color: "#1D1D1F",
                      textDecoration: "none",
                      borderRadius: 8,
                    }}
                    onMouseEnter={(e) =>
                      ((e.target as HTMLElement).style.background = "#F5F5F7")
                    }
                    onMouseLeave={(e) =>
                      ((e.target as HTMLElement).style.background = "transparent")
                    }
                  >
                    Settings
                  </Link>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 14,
                      color: "#FF3B30",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      borderRadius: 8,
                    }}
                    onMouseEnter={(e) =>
                      ((e.target as HTMLElement).style.background = "rgba(255,59,48,0.06)")
                    }
                    onMouseLeave={(e) =>
                      ((e.target as HTMLElement).style.background = "transparent")
                    }
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
