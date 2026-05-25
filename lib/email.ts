import crypto from "crypto";
import { Resend } from "resend";
import { createLoginApproval } from "@/lib/login-approval";
// prisma is imported lazily inside functions to avoid cold-start overhead
const resend = new Resend(process.env.RESEND_API_KEY || "");

const FROM_EMAIL = process.env.EMAIL_FROM || "Better Form <notifications@betterform.dev>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function sendVerificationEmail(userId: string, userEmail: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  const { default: _prisma } = await import('./db')
  await _prisma.emailVerification.create({
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
    subject: "Confirm your Better Form sign up",
    html: `
      <div style="background:#f8fafc;padding:24px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="padding:24px 24px 8px 24px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">Better Form</p>
            <h1 style="margin:8px 0 0 0;font-size:22px;line-height:30px;font-weight:600;color:#0f172a;">Verify your email address</h1>
          </div>
          <div style="padding:16px 24px 0 24px;font-size:15px;line-height:24px;color:#334155;">
            <p style="margin:0 0 14px 0;">You requested to create a Better Form account with <strong>${userEmail}</strong>.</p>
            <p style="margin:0 0 18px 0;">Open the verification page and choose <strong>Yes, this was me</strong> to finish sign up.</p>
          </div>
          <div style="padding:0 24px 24px 24px;">
            <a href="${verifyUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600;">Review sign up request</a>
            <p style="margin:14px 0 0 0;font-size:12px;line-height:18px;color:#64748b;word-break:break-all;">${verifyUrl}</p>
          </div>
          <div style="border-top:1px solid #e2e8f0;padding:14px 24px 20px 24px;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#64748b;">If this wasn’t you, choose <strong>No, this was not me</strong> on the verification page. This link expires in 24 hours.</p>
          </div>
        </div>
      </div>
    `,
  });

  return { sent: true, expiresAt };
}

export async function sendLoginApprovalEmail(userId: string, userEmail: string, approvalId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15m

  await createLoginApproval({
    id: approvalId,
    userId,
    tokenHash,
    expiresAt,
  })

  const verifyUrl = `${APP_URL}/verify-login?t=${token}&aid=${approvalId}`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "Approve your Better Form sign in",
    html: `
      <div style="background:#f8fafc;padding:24px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="padding:24px 24px 8px 24px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">Better Form</p>
            <h1 style="margin:8px 0 0 0;font-size:22px;line-height:30px;font-weight:600;color:#0f172a;">Approve sign in request</h1>
          </div>
          <div style="padding:16px 24px 0 24px;font-size:15px;line-height:24px;color:#334155;">
            <p style="margin:0 0 14px 0;">You attempted to sign in with <strong>${userEmail}</strong>.</p>
            <p style="margin:0 0 18px 0;">Open this page and choose <strong>Yes, this was me</strong> to continue sign in.</p>
          </div>
          <div style="padding:0 24px 24px 24px;">
            <a href="${verifyUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600;">Review sign in request</a>
            <p style="margin:14px 0 0 0;font-size:12px;line-height:18px;color:#64748b;word-break:break-all;">${verifyUrl}</p>
          </div>
          <div style="border-top:1px solid #e2e8f0;padding:14px 24px 20px 24px;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#64748b;">If this wasn’t you, choose <strong>No, this was not me</strong>. This link expires in 15 minutes.</p>
          </div>
        </div>
      </div>
    `,
  })

  return { sent: true, expiresAt, approvalId }
}

export async function sendFormSubmissionAlert(params: {
  to: string
  formName: string
  publicId: string
  responseId: string
  responses: Record<string, unknown>
  responsePreview?: Array<{ label: string; value: string }>
  respondentEmail?: string | null
  submittedAt: Date
}) {
  const entries =
    params.responsePreview?.slice(0, 8) ||
    Object.entries(params.responses).slice(0, 8).map(([key, value]) => ({
      label: key,
      value: Array.isArray(value) ? value.join(", ") : String(value ?? "—"),
    }))
  const fieldsHtml = entries
    .map(({ label, value }) => {
      const displayValue = value || "—"
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;vertical-align:top;">${label}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${displayValue}</td>
      </tr>`
    })
    .join("")

  const responseUrl = `${APP_URL}/dashboard`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `New response for ${params.formName}`,
    html: `
      <div style="background:#f8fafc;padding:24px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="padding:24px 24px 8px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">Better Form</p>
            <h1 style="margin:8px 0 0;font-size:22px;line-height:30px;font-weight:700;">${params.formName} has a new response</h1>
          </div>
          <div style="padding:16px 24px 0;font-size:15px;line-height:24px;color:#334155;">
            <p style="margin:0 0 12px;">A respondent just submitted your form.</p>
            <p style="margin:0 0 12px;"><strong>Response ID:</strong> ${params.responseId}</p>
            <p style="margin:0 0 18px;"><strong>Respondent email:</strong> ${params.respondentEmail || "Not provided"}</p>
          </div>
          <div style="padding:0 24px 24px;">
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              ${fieldsHtml || '<tr><td style="padding:12px;">No fields were included in this notification preview.</td></tr>'}
            </table>
            <p style="margin:14px 0 18px;font-size:12px;line-height:18px;color:#64748b;">Submitted at ${params.submittedAt.toISOString()}</p>
            <a href="${responseUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600;">Open Better Form</a>
          </div>
        </div>
      </div>
    `,
  })
}

export async function verifyEmailToken(userId: string, presentedToken: string) {
  const tokenHash = sha256Hex(presentedToken);
  const { default: _prisma } = await import('./db')
  const row = await _prisma.emailVerification.findFirst({ where: { userId, tokenHash } });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.used) return { ok: false, reason: "used" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await _prisma.emailVerification.update({ where: { id: row.id }, data: { used: true } });
  await _prisma.account.update({ where: { id: userId }, data: { /* optional: emailVerified: true */ } });

  return { ok: true };
}

const emailService = { sendVerificationEmail, sendLoginApprovalEmail, sendFormSubmissionAlert, verifyEmailToken };

export default emailService;
