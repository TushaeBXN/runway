"use client";

import { SessionProvider } from "next-auth/react";
import Nav from "@/components/Nav";
import { usePathname } from "next/navigation";

// Pages that should not show the app Nav (they have their own or are public)
const NAV_HIDDEN_PATHS = ["/", "/login", "/register", "/onboarding"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = NAV_HIDDEN_PATHS.includes(pathname);

  return (
    <SessionProvider>
      {!hideNav && <Nav />}
      <main
        style={{
          paddingTop: hideNav ? 0 : "calc(var(--nav-height) + 24px)",
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
    </SessionProvider>
  );
}
