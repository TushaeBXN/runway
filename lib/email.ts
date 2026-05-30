/**
 * IMAP email client — connects to Gmail, Outlook, Yahoo, or any IMAP server.
 * Uses imapflow for reliable IMAP connections.
 */

export interface EmailMessage {
  uid: number;
  subject: string;
  from: string;
  date: string;
  body: string;
  isRead: boolean;
}

export interface EmailAccountConfig {
  host: string;
  port: number;
  username: string;
  appPassword: string;
}

export const PROVIDER_PRESETS: Record<string, { host: string; port: number; steps: string[] }> = {
  gmail: {
    host: "imap.gmail.com",
    port: 993,
    steps: [
      "Sign in to your Google account at myaccount.google.com",
      'Go to Security → 2-Step Verification and make sure it\'s ON',
      'Go to Security → App passwords (search "App passwords" if you don\'t see it)',
      'Click "Create app password", name it "Runway", and copy the 16-character code',
      "Paste that code below as your App Password — NOT your regular Gmail password",
    ],
  },
  outlook: {
    host: "outlook.office365.com",
    port: 993,
    steps: [
      "Sign in to outlook.com",
      "Click the gear icon → View all Outlook settings → Mail → Sync email",
      'Make sure IMAP is enabled',
      'Go to account.microsoft.com → Security → App passwords → Create a new app password',
      "Paste that password below",
    ],
  },
  yahoo: {
    host: "imap.mail.yahoo.com",
    port: 993,
    steps: [
      "Sign in to Yahoo Mail",
      "Click your name → Account Security",
      'Click "Generate app password", select "Other app", name it "Runway"',
      "Paste the generated password below",
    ],
  },
  imap: {
    host: "",
    port: 993,
    steps: [
      "Contact your email provider for IMAP server settings",
      "Enter the IMAP host and port below",
      "Use your email address as the username",
      "Use your email password or an app-specific password",
    ],
  },
};

export async function fetchUnreadEmails(config: EmailAccountConfig, limit = 10): Promise<EmailMessage[]> {
  const { ImapFlow } = await import("imapflow");

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.username,
      pass: config.appPassword,
    },
    logger: false,
  });

  const messages: EmailMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status = await client.status("INBOX", { unseen: true });
      if (!status.unseen) return [];

      for await (const msg of client.fetch(
        { seen: false },
        { uid: true, flags: true, envelope: true, bodyStructure: true, source: true },
        { uid: true }
      )) {
        const source = msg.source?.toString() ?? "";
        // Extract plain text body from raw source
        const bodyMatch = source.match(/\r\n\r\n([\s\S]+?)(?:\r\n--|\s*$)/);
        const body = bodyMatch
          ? bodyMatch[1].replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).trim()
          : "(no body)";

        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: msg.envelope?.from?.[0]?.address ?? "(unknown)",
          date: msg.envelope?.date?.toISOString() ?? new Date().toISOString(),
          body: body.slice(0, 2000),
          isRead: msg.flags?.has("\\Seen") ?? false,
        });

        if (messages.length >= limit) break;
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    await client.logout().catch(() => null);
    throw err;
  }

  return messages;
}

export async function testConnection(config: EmailAccountConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: true,
      auth: { user: config.username, pass: config.appPassword },
      logger: false,
    });
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
