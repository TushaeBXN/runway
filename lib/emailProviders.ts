// Client-safe email provider constants — no server imports
export const PROVIDER_PRESETS: Record<string, { host: string; port: number; steps: string[] }> = {
  gmail: {
    host: "imap.gmail.com",
    port: 993,
    steps: [
      "Sign in to your Google account at myaccount.google.com",
      "Go to Security → 2-Step Verification and make sure it's ON",
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
      "Make sure IMAP is enabled",
      "Go to account.microsoft.com → Security → App passwords → Create a new app password",
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
