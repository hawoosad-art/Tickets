import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { logStructured } from "@/lib/logger";
import { RenderedEmail } from "@/services/email/templates";

export async function enqueueAndSendEmail(params: {
  deduplicationKey: string;
  recipientEmail: string;
  userId?: string | null;
  templateType: string;
  rendered: RenderedEmail;
}): Promise<{ jobId: string; status: string }> {
  // Deduplicated upsert so retries or webhook replays never send duplicate emails
  const existing = await prisma.notificationJob.findUnique({
    where: { deduplicationKey: params.deduplicationKey },
  });

  if (existing && existing.status === "SENT") {
    return { jobId: existing.id, status: existing.status };
  }

  const job =
    existing ??
    (await prisma.notificationJob.create({
      data: {
        deduplicationKey: params.deduplicationKey,
        recipientEmail: params.recipientEmail.toLowerCase(),
        userId: params.userId ?? null,
        templateType: params.templateType,
        subject: params.rendered.subject,
        htmlBody: params.rendered.html,
        textBody: params.rendered.text,
        status: "QUEUED",
      },
    }));

  // Dispatch immediately without throwing upstream (email failures NEVER break ticket issuance)
  try {
    await dispatchNotificationJob(job.id);
  } catch (err) {
    logStructured("warn", "email_dispatch_deferred", {
      jobId: job.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const updated = await prisma.notificationJob.findUnique({
    where: { id: job.id },
  });
  return { jobId: job.id, status: updated?.status ?? "QUEUED" };
}

export async function dispatchNotificationJob(jobId: string): Promise<void> {
  const job = await prisma.notificationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "SENT") return;

  const provider = (process.env.EMAIL_PROVIDER || "outbox").toLowerCase();
  const fromAddress =
    process.env.EMAIL_FROM || "Ticket254 Tickets <tickets@ticket254.co.ke>";

  await prisma.notificationJob.update({
    where: { id: job.id },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
    },
  });

  try {
    let providerMessageId = `outbox-${job.id}`;

    if (provider === "resend" && process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": job.deduplicationKey,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [job.recipientEmail],
          subject: job.subject,
          html: job.htmlBody,
          text: job.textBody,
        }),
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Resend HTTP ${response.status}: ${errBody}`);
      }
      const data = (await response.json()) as { id?: string };
      providerMessageId = data.id || providerMessageId;
    } else if (
      provider === "smtp" &&
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const info = await transporter.sendMail({
        from: fromAddress,
        to: job.recipientEmail,
        subject: job.subject,
        html: job.htmlBody,
        text: job.textBody,
      });
      providerMessageId = info.messageId || providerMessageId;
    }

    await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: "SENT",
        providerMessageId,
        sentAt: new Date(),
        lastError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const nextAttempt = job.attempts + 1;
    const backoffMs = Math.min(30 * 60 * 1000, Math.pow(2, nextAttempt) * 15000);
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: nextAttempt >= job.maxAttempts ? "FAILED" : "QUEUED",
        lastError: message.slice(0, 500),
        nextRetryAt: new Date(Date.now() + backoffMs),
      },
    });
    throw err;
  }
}

export async function retryQueuedEmailJobs(limit = 20): Promise<number> {
  const dueJobs = await prisma.notificationJob.findMany({
    where: {
      status: "QUEUED",
      attempts: { lt: 3 },
      nextRetryAt: { lte: new Date() },
    },
    take: limit,
    orderBy: { nextRetryAt: "asc" },
  });

  let processed = 0;
  for (const job of dueJobs) {
    try {
      await dispatchNotificationJob(job.id);
      processed++;
    } catch {
      // Logged on job record
    }
  }
  return processed;
}
