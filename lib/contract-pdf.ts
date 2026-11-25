import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Actor } from "./roles";
import { sql } from "./sql";

/**
 * The Contract as a PDF: one A4 document for both parties. The text is English; the built-in Helvetica needs no font file
 * and no headless browser, so it runs on Vercel. Characters Helvetica cannot draw (Urdu, say) are shown as "?".
 * It is not legally binding by itself, and says so.
 */
export interface ContractPdfData {
  id: number;
  status: "sent" | "accepted" | "declined" | "withdrawn" | "ended";
  sentAt: string;
  decidedAt: string | null;
  /** The email of whoever answered. */
  decidedBy: string | null;
  declineReason: string | null;
  endedAt: string | null;
  scope: string;
  pricePkr: number | null;
  startDate: string | null;
  finishDate: string;
  paymentTerms: string | null;
  issue: { id: number; title: string; category: string; sector: string };
  authority: { name: string; area: string | null; email: string | null; phone: string | null };
  business: { name: string; department: string; sector: string; email: string | null; phone: string | null };
  siteUrl: string;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.4, 0.4, 0.4);
const RULE = rgb(0.75, 0.75, 0.75);

const day = (iso: string) => new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
const moment = (iso: string) => new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().replace("T", " ").slice(0, 16) + " (Islamabad)";
const title = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const STATUS: Record<ContractPdfData["status"], string> = {
  sent: "Sent. Waiting for the Business to answer. Not yet agreed.",
  accepted: "Accepted",
  declined: "Declined. Not agreed.",
  withdrawn: "Withdrawn by the Authority before an answer. Not agreed.",
  ended: "Ended. The job left the Business after it was accepted.",
};

/** Lays text out down A4 pages, starting a new page when one is full. */
class Writer {
  page: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
  ) {
    this.page = doc.addPage(A4);
    this.y = A4[1] - MARGIN;
  }
  private clean(s: string, f: PDFFont) {
    const ok = new Set(f.getCharacterSet());
    return [...s].map((ch) => (ch === "\t" ? " " : ok.has(ch.codePointAt(0)!) ? ch : "?")).join("");
  }
  need(h: number) {
    if (this.y - h < MARGIN) {
      this.page = this.doc.addPage(A4);
      this.y = A4[1] - MARGIN;
    }
  }
  space(h: number) {
    this.y -= h;
  }
  rule() {
    this.need(10);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: A4[0] - MARGIN, y: this.y }, thickness: 0.6, color: RULE });
    this.y -= 10;
  }
  /** Wrapped text, `indent` points in from the left margin. */
  text(s: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; width?: number } = {}) {
    const size = o.size ?? 10.5;
    const f = o.bold ? this.bold : this.font;
    const x = MARGIN + (o.indent ?? 0);
    const max = (o.width ?? A4[0] - 2 * MARGIN - (o.indent ?? 0));
    for (const para of this.clean(s, f).split(/\r?\n/)) {
      let line = "";
      const flush = () => {
        this.need(size * 1.4);
        this.page.drawText(line, { x, y: this.y - size, size, font: f, color: o.color ?? INK });
        this.y -= size * 1.4;
        line = "";
      };
      for (const word of para.split(" ")) {
        let w = word;
        // A single word longer than the line is cut.
        while (f.widthOfTextAtSize(w, size) > max) {
          let n = w.length;
          while (n > 1 && f.widthOfTextAtSize(w.slice(0, n), size) > max) n--;
          if (line) flush();
          line = w.slice(0, n);
          flush();
          w = w.slice(n);
        }
        const next = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(next, size) > max && line) {
          flush();
          line = w;
        } else line = next;
      }
      flush();
    }
  }
  heading(s: string) {
    this.space(6);
    this.need(30);
    this.text(s, { size: 12.5, bold: true });
    this.space(2);
  }
  field(k: string, v: string) {
    this.need(16);
    const top = this.y;
    this.text(k, { size: 9.5, color: MUTED, width: 110 });
    const after = this.y;
    this.y = top;
    this.text(v, { indent: 120 });
    this.y = Math.min(this.y, after);
  }
}

async function embedPhoto(doc: PDFDocument, photo: Buffer | null): Promise<PDFImage | null> {
  if (!photo) return null;
  try {
    return await doc.embedJpg(photo);
  } catch {
    try {
      return await doc.embedPng(photo);
    } catch {
      return null; // another format, or not an image: the PDF goes without it
    }
  }
}

/** The PDF for one contract. `photo` is the Issue's cover photo bytes, if they could be fetched. Pure: no network. */
export async function renderContractPdf(d: ContractPdfData, photo: Buffer | null): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Contract ${d.id}: ${d.issue.title}`.replace(/[^\x20-\x7e]/g, "?"));
  doc.setProducer("Invisible City");
  doc.setCreator("Invisible City");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);

  w.text("Invisible City", { size: 9.5, color: MUTED });
  w.text("Contract for a city job", { size: 20, bold: true });
  w.text(`Contract ${d.id}  ·  Sent ${day(d.sentAt)}`, { color: MUTED });
  w.space(4);
  w.rule();

  w.heading("The Authority");
  w.field("Name", d.authority.name);
  w.field("Area", d.authority.area ?? "Whole city");
  if (d.authority.email) w.field("Email", d.authority.email);
  if (d.authority.phone) w.field("Phone", d.authority.phone);

  w.heading("The Business");
  w.field("Name", d.business.name);
  w.field("Department", d.business.department);
  w.field("Sector", d.business.sector);
  if (d.business.phone) w.field("Phone", d.business.phone);
  if (d.business.email) w.field("Email", d.business.email);
  w.space(2);
  w.text("Contact details are shown because both parties are officials of this job.", { size: 8.5, color: MUTED });

  w.heading("The Issue");
  w.field("Title", d.issue.title);
  w.field("Category", title(d.issue.category));
  w.field("Sector", d.issue.sector);
  w.field("Find it", `${d.siteUrl}/issues/${d.issue.id}  (Issue ${d.issue.id})`);
  const img = await embedPhoto(doc, photo);
  if (img) {
    const box = { w: 220, h: 150 };
    const k = Math.min(box.w / img.width, box.h / img.height, 1);
    w.need(img.height * k + 8);
    w.space(4);
    w.page.drawImage(img, { x: MARGIN + 120, y: w.y - img.height * k, width: img.width * k, height: img.height * k });
    w.space(img.height * k + 6);
  }

  w.heading("Terms");
  w.field("Work to be done", d.scope);
  w.field("Price", d.pricePkr === null ? "To be agreed" : `PKR ${d.pricePkr.toLocaleString("en-US")}`);
  w.field("Start", d.startDate ?? "Not stated");
  w.field("Finish by", d.finishDate);
  w.field("Payment terms", d.paymentTerms ?? "Not stated");

  w.heading("Acceptance record");
  w.field("Status", STATUS[d.status]);
  w.field("Sent", moment(d.sentAt));
  if (d.decidedAt) {
    const verb = { accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn", sent: "", ended: "Accepted" }[d.status];
    if (verb) w.field(verb, `${moment(d.decidedAt)}${d.decidedBy ? ` by ${d.decidedBy}` : ""}`);
  }
  if (d.declineReason) w.field("Reason", d.declineReason);
  if (d.endedAt) w.field("Ended", moment(d.endedAt));

  w.need(150);
  w.space(40);
  const colW = (A4[0] - 2 * MARGIN - 40) / 2;
  const lineY = w.y;
  for (const [i, who] of [d.authority.name, d.business.name].entries()) {
    const x = MARGIN + i * (colW + 40);
    w.page.drawLine({ start: { x, y: lineY }, end: { x: x + colW, y: lineY }, thickness: 0.8, color: INK });
    w.y = lineY - 4;
    w.text(i === 0 ? "Signature: the Authority" : "Signature: the Business", { size: 9.5, bold: true, indent: i * (colW + 40), width: colW });
    w.text(who, { size: 9.5, color: MUTED, indent: i * (colW + 40), width: colW });
    w.text("Date:", { size: 9.5, color: MUTED, indent: i * (colW + 40), width: colW });
  }
  w.space(20);
  w.text("This document is not legally binding by itself.", { bold: true, size: 10.5 });

  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/** The contract's data, or null when it does not exist. No access check: callers decide who may have it. */
async function loadContract(id: number) {
  const [c] = await sql().query<{
    id: number;
    status: ContractPdfData["status"];
    sent_at: string;
    decided_at: string | null;
    decided_by: string | null;
    decline_reason: string | null;
    ended_at: string | null;
    scope: string;
    price_pkr: number | null;
    start_date: string | null;
    finish_date: string;
    payment_terms: string | null;
    authority_name: string;
    authority_email: string | null;
    authority_phone: string | null;
    issue_id: number;
    title: string;
    category: string;
    neighborhood: string;
    cover_image: string | null;
    is_demo: boolean;
    office_id: number;
    office: string;
    office_sector: string;
    office_phone: string | null;
    department: string;
    office_email: string | null;
  }>(
    `SELECT c.id, c.status, c.sent_at, c.decided_at, c.decided_by, c.decline_reason, c.ended_at, c.scope, c.price_pkr,
            to_char(c.start_date, 'YYYY-MM-DD') AS start_date, to_char(c.finish_date, 'YYYY-MM-DD') AS finish_date,
            c.payment_terms, c.authority_name, p.email AS authority_email, p.phone AS authority_phone,
            i.id AS issue_id, i.title, i.category, i.neighborhood, i.cover_image, i.is_demo,
            o.id AS office_id, o.name AS office, o.sector AS office_sector, o.phone AS office_phone, d.name AS department,
            (SELECT min(s.email) FROM office_staff s WHERE s.office_id = o.id) AS office_email
     FROM contracts c
     JOIN issues i ON i.id = c.issue_id AND i.deleted_at IS NULL
     JOIN offices o ON o.id = c.office_id
     JOIN departments d ON d.id = o.department_id
     LEFT JOIN people p ON p.id = c.authority_id
     WHERE c.id = $1`,
    [id],
  );
  if (!c) return null;
  const [area] = await sql().query<{ area: string | null }>(
    `SELECT area FROM access_requests WHERE lower(official_email) = lower($1) AND decision = 'approved' AND is_demo = $2
     ORDER BY decided_at DESC NULLS LAST, id DESC LIMIT 1`,
    [c.authority_email ?? "", c.is_demo],
  );
  const data: ContractPdfData = {
    id: c.id,
    status: c.status,
    sentAt: c.sent_at,
    decidedAt: c.decided_at,
    decidedBy: c.decided_by,
    declineReason: c.decline_reason,
    endedAt: c.ended_at,
    scope: c.scope,
    pricePkr: c.price_pkr,
    startDate: c.start_date,
    finishDate: c.finish_date,
    paymentTerms: c.payment_terms,
    issue: { id: c.issue_id, title: c.title, category: c.category, sector: c.neighborhood },
    authority: { name: c.authority_name, area: area ? area.area : c.neighborhood, email: c.authority_email, phone: c.authority_phone },
    business: { name: c.office, department: c.department, sector: c.office_sector, email: c.office_email, phone: c.office_phone },
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  };
  return { data, coverImage: c.cover_image, isDemo: c.is_demo, officeId: c.office_id, area: c.neighborhood };
}

/** The cover photo's bytes, or null when it cannot be fetched quickly. A missing photo never fails the PDF. */
async function fetchPhoto(url: string | null): Promise<Buffer | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length <= 8 * 1024 * 1024 ? bytes : null;
  } catch {
    return null;
  }
}

/** The PDF of a contract. Null when it does not exist. */
async function build(c: NonNullable<Awaited<ReturnType<typeof loadContract>>>) {
  return renderContractPdf(c.data, await fetchPhoto(c.coverImage));
}

/** The PDF for the Authority of the Issue's area (or of the whole city) or the Business the contract is for, in their own world. */
export async function contractPdfFor(actor: Actor, id: number): Promise<Buffer | null> {
  const c = await loadContract(id);
  if (!c || c.isDemo !== actor.isDemo) return null;
  const mine = actor.role === "office" ? c.officeId === actor.officeId : actor.role === "authority" && (actor.area === null || actor.area === c.area);
  return mine ? build(c) : null;
}

/** An email attachment for a contract, or none when the PDF could not be made. Never throws. */
export async function contractPdfAttachment(id: number) {
  try {
    const c = await loadContract(id);
    if (!c) return [];
    return [{ filename: `contract-${id}.pdf`, content: await build(c), contentType: "application/pdf" }];
  } catch (err) {
    console.error("[contract-pdf] could not make the PDF", err);
    return [];
  }
}
