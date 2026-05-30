/**
 * AES-256-GCM encryption for sensitive fields at rest.
 * Used for: API keys, email app passwords, EIN, D-U-N-S, credentials.
 * Key comes from ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (hex.length < 64) {
    // Pad with zeros for build-time — real key must be set in production
    return Buffer.alloc(32);
  }
  return Buffer.from(hex.slice(0, 64), "hex");
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(24 hex) + tag(32 hex) + ciphertext(hex)
  return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || ciphertext.length < 56) return ciphertext;
  try {
    const key = getKey();
    const iv = Buffer.from(ciphertext.slice(0, 24), "hex");
    const tag = Buffer.from(ciphertext.slice(24, 56), "hex");
    const data = Buffer.from(ciphertext.slice(56), "hex");
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString("utf8") + decipher.final("utf8");
  } catch {
    return ciphertext; // Return as-is if decryption fails (migration safety)
  }
}

/** Mask a sensitive value for display — shows only last 4 chars */
export function mask(value: string | null | undefined, showLast = 4): string {
  if (!value) return "";
  const last = value.slice(-showLast);
  return `${"•".repeat(Math.max(4, value.length - showLast))}${last}`;
}
