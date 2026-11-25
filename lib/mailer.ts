/**
 * Mailer adapter: sends one email. Real: Gmail SMTP with an app password (GMAIL_USER, GMAIL_APP_PASSWORD).
 * Fake: records what would have been sent, for tests. With no Gmail settings the real one only logs.
 */
export interface Mail {
  to: string[];
  subject: string;
  body: string;
  attachments?: MailAttachment[];
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export function fakeMailer(): Mailer & { sent: Mail[] } {
  const m = {
    sent: [] as Mail[],
    async send(mail: Mail) {
      m.sent.push(mail);
    },
  };
  return m;
}

function gmailMailer(user: string, pass: string): Mailer {
  return {
    async send(mail) {
      const { createTransport } = await import("nodemailer");
      const transport = createTransport({
        service: "gmail",
        auth: { user, pass },
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 10_000,
      });
      await transport.sendMail({ from: `Invisible City <${user}>`, to: mail.to, subject: mail.subject, text: mail.body,
        attachments: mail.attachments,
      });
    },
  };
}

let current: Mailer | null = null;
export function setMailer(m: Mailer | null) {
  current = m;
}

export function mailer(): Mailer {
  if (current) return current;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (user && pass) return (current = gmailMailer(user, pass));
  return {
    async send(mail) {
      console.warn(`[mailer] Gmail is not configured; not sending "${mail.subject}" to ${mail.to.length} recipient(s)`);
    },
  };
}

/** Sends, but a mail failure never fails the action that triggered it. */
export async function sendQuietly(mail: Mail) {
  if (mail.to.length === 0) return;
  try {
    await mailer().send(mail);
  } catch (err) {
    console.error("[mailer] could not send", err);
  }
}
