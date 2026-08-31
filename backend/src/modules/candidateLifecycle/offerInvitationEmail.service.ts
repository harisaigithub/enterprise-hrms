import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export type OfferEmailDelivery = {
  status: "sent" | "skipped" | "failed";
  message: string;
};

type OfferInvitationEmailInput = {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  proposedSalary: number;
  joiningDate: Date | null;
  invitationUrl: string;
  expiresAt: Date;
};

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (date: Date) => new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
}).format(date);

export async function sendOfferInvitationEmail(input: OfferInvitationEmailInput): Promise<OfferEmailDelivery> {
  if (!env.SMTP_HOST || !env.SMTP_FROM_EMAIL) {
    return {
      status: "skipped",
      message: "SMTP is not configured. Share the invitation link manually.",
    };
  }

  if ((env.SMTP_USER && !env.SMTP_PASS) || (!env.SMTP_USER && env.SMTP_PASS)) {
    logger.warn("Offer email skipped because SMTP_USER and SMTP_PASS must be configured together");
    return {
      status: "skipped",
      message: "SMTP credentials are incomplete. Share the invitation link manually.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });

  const candidateName = escapeHtml(input.candidateName);
  const jobTitle = escapeHtml(input.jobTitle);
  const salary = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(input.proposedSalary);
  const joiningDate = input.joiningDate ? formatDate(input.joiningDate) : "To be confirmed";

  try {
    await transporter.sendMail({
      from: { name: env.SMTP_FROM_NAME, address: env.SMTP_FROM_EMAIL },
      to: input.candidateEmail,
      subject: `Your offer for ${input.jobTitle} at Proteccio`,
      text: [
        `Hello ${input.candidateName},`,
        "",
        `We are pleased to share your offer for the ${input.jobTitle} position.`,
        `Annual compensation: ${salary}`,
        `Joining date: ${joiningDate}`,
        "",
        `Review and respond to your offer: ${input.invitationUrl}`,
        `This secure invitation expires on ${formatDate(input.expiresAt)}.`,
        "",
        "Regards,",
        "Proteccio HR Team",
      ].join("\n"),
      html: `
        <div style="background:#f4f7f9;padding:32px 16px;font-family:Arial,sans-serif;color:#172533">
          <div style="max-width:620px;margin:auto;background:#fff;border:1px solid #dce5ea;border-radius:14px;overflow:hidden">
            <div style="background:#087f75;padding:24px 30px;color:#fff">
              <div style="font-size:20px;font-weight:700">Proteccio HRMS</div>
              <div style="margin-top:5px;opacity:.9">Offer invitation</div>
            </div>
            <div style="padding:30px">
              <p>Hello ${candidateName},</p>
              <p>We are pleased to share your offer for the <strong>${jobTitle}</strong> position.</p>
              <div style="margin:24px 0;padding:18px;background:#f3f7f9;border-radius:10px;line-height:1.8">
                <div><strong>Annual compensation:</strong> ${salary}</div>
                <div><strong>Joining date:</strong> ${joiningDate}</div>
              </div>
              <a href="${escapeHtml(input.invitationUrl)}" style="display:inline-block;padding:12px 20px;background:#087f75;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">View and respond to offer</a>
              <p style="margin-top:24px;color:#5c7080;font-size:13px">This secure invitation expires on ${formatDate(input.expiresAt)}. Please do not forward this email.</p>
              <p style="margin-top:28px">Regards,<br><strong>Proteccio HR Team</strong></p>
            </div>
          </div>
        </div>`,
    });

    logger.info({ candidateEmail: input.candidateEmail, jobTitle: input.jobTitle }, "Offer invitation email sent");
    return { status: "sent", message: `Invitation email sent to ${input.candidateEmail}.` };
  } catch (error) {
    logger.error({ err: error, candidateEmail: input.candidateEmail }, "Failed to send offer invitation email");
    return {
      status: "failed",
      message: "The offer was created, but the email could not be sent. Share the invitation link manually.",
    };
  }
}
