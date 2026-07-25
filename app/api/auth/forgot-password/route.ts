import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Always return success to avoid leaking which emails are registered
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return NextResponse.json({ ok: true });

  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Create a new token — 32 random bytes = 64 hex chars
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Runway <noreply@runway.app>",
      to: user.email,
      subject: "Reset your Runway password",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:26px;font-weight:700;color:#1D1D1F;letter-spacing:-0.5px;">Runway</span>
      <p style="color:#6E6E73;font-size:14px;margin:6px 0 0;">AI agent platform for nonprofits</p>
    </div>

    <h1 style="font-size:20px;font-weight:700;color:#1D1D1F;margin:0 0 12px;">Reset your password</h1>
    <p style="font-size:15px;color:#3C3C43;line-height:1.6;margin:0 0 28px;">
      We received a request to reset the password for your Runway account (<strong>${user.email}</strong>).
      Click the button below to choose a new password.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#1D1D1F;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;">
        Reset Password
      </a>
    </div>

    <p style="font-size:13px;color:#8E8E93;line-height:1.6;margin:0 0 8px;">
      This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.
    </p>

    <hr style="border:none;border-top:1px solid #F0F0F0;margin:24px 0;">
    <p style="font-size:12px;color:#C7C7CC;text-align:center;margin:0;">
      If the button doesn't work, copy this link into your browser:<br>
      <span style="color:#007AFF;word-break:break-all;">${resetUrl}</span>
    </p>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("Password reset email failed:", err);
    // Still return ok — don't expose email failures to the client
  }

  return NextResponse.json({ ok: true });
}
