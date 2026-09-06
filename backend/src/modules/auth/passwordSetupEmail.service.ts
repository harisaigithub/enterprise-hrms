import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export type PasswordSetupDelivery = { status: "sent" | "skipped" | "failed"; message: string };

export async function sendPasswordSetupEmail(email: string, name: string, setupUrl: string): Promise<PasswordSetupDelivery> {
  if (!env.SMTP_HOST || !env.SMTP_FROM_EMAIL) {
    return { status: "skipped", message: "Password setup email is not configured." };
  }
  if ((env.SMTP_USER && !env.SMTP_PASS) || (!env.SMTP_USER && env.SMTP_PASS)) {
    return { status: "skipped", message: "SMTP credentials are incomplete." };
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
  });
  try {
    await transporter.sendMail({
      from: { name: env.SMTP_FROM_NAME, address: env.SMTP_FROM_EMAIL },
      to: email,
      subject: "Set up your Proteccio HRMS password",
      text: `Hello ${name},\n\nUse this single-use link to set your password:\n${setupUrl}\n\nThe link expires in 60 minutes. If you did not request it, ignore this email.`,
    });
    return { status: "sent", message: "A password setup link has been sent to the employee." };
  } catch (error) {
    logger.error({ err: error, email }, "Failed to send password setup email");
    return { status: "failed", message: "The account was created, but the password setup email could not be sent." };
  }
}
