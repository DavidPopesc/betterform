import crypto from "crypto";
import { Resend } from "resend";
import prisma from "./db";
const resend = new Resend(process.env.RESEND_API_KEY || "");

const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@example.com";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function sendVerificationEmail(userId: string, userEmail: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  await prisma.emailVerification.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const verifyUrl = `${APP_URL}/verify-email?t=${token}&uid=${userId}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "Verify your email",
    html: `
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify email</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });

  return { sent: true, expiresAt };
}

export async function verifyEmailToken(userId: string, presentedToken: string) {
  const tokenHash = sha256Hex(presentedToken);
  const row = await prisma.emailVerification.findFirst({ where: { userId, tokenHash } });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.used) return { ok: false, reason: "used" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await prisma.emailVerification.update({ where: { id: row.id }, data: { used: true } });
  await prisma.account.update({ where: { id: userId }, data: { /* optional: emailVerified: true */ } });

  return { ok: true };
}

export default { sendVerificationEmail, verifyEmailToken };
