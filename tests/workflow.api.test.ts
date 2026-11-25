import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as confirm } from "../app/api/issues/[id]/confirm/route";
import { POST as fix } from "../app/api/issues/[id]/fix/route";
import { POST as reject } from "../app/api/issues/[id]/reject/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { POST as sendBack } from "../app/api/issues/[id]/send-back/route";
import { POST as start } from "../app/api/issues/[id]/start/route";
import { GET as listIssues } from "../app/api/issues/route";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { GET as jobs } from "../app/api/office/jobs/route";
import { GET as listOffices, POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { GET as myReports, POST as submitReport } from "../app/api/reports/route";
import { DELETE as revokeBusiness } from "../app/api/super-admin/businesses/[id]/route";
import { setAnalyzer } from "../lib/ai";
import { advanceClock, setClock } from "../lib/clock";
import { setSession } from "../lib/session";
import { assign, ctx, NOW, SUPER_ADMIN, signInAs, signInDemo, startTestApp } from "./helpers";

/**
 * Ticket 06: the Office's work and the Citizen's answer, row by row through the Issue state machine
 * in the spec. Everything happens in the real (non-demo) world, so emails are sent.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
let roads: number;
let otherRoads: number;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    "INSERT INTO access_requests (name, official_email, decision, is_demo) VALUES ('Ayesha', 'official@gov.pk', 'approved', false)",
  );
  roads = await newOffice("F-7 Roads Office", 33.72, 73.05);
  otherRoads = await newOffice("I-8 Roads Office", 33.66, 73.08);
  await staff(roads, "crew-1@gov.pk");
  await staff(otherRoads, "elsewhere@gov.pk");
});
afterAll(() => app.stop());

beforeEach(() => {
  process.env.DEMO_MODE = "true";
  setSession(null);
  setClock(NOW);
  app.mail.sent.length = 0;
  setAnalyzer(async () => ({
    is_civic_issue: true,
    category: "road_damage",
    severity: "high",
    confidence: 0.9,
    title: "Deep pothole",
    summary: "A deep pothole in the road.",
    hazards: [],
    source: "gemini",
  }));
});
afterEach(() => setAnalyzer(null));

// ---------------------------------------------------------------------------
// Helpers: each one is a person doing something through the API
// ---------------------------------------------------------------------------
const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const id = (n: number) => ctx({ id: String(n) });
const authority = () => signInAs("official@gov.pk");
const crew = () => signInAs("crew-1@gov.pk");

async function newOffice(name: string, lat: number, lng: number) {
  authority();
  const { departments } = await (await listOffices()).json();
  const departmentId = departments.find((d: { name: string }) => d.name === "Roads").id;
  const res = await addOffice(json({ name, departmentId, sector: "F-7", lat, lng }));
  return (await res.json()).id as number;
}
const staff = (officeId: number, email: string) => addStaff(json({ email }), id(officeId));

async function citizen(name: string) {
  signInAs(`${name}@gmail.com`);
  await saveProfile(json({ displayName: name, phone: "0300 1234567" }, "PUT"));
}

let spot = 0;
/** Two Citizens report the same pothole at a fresh spot; returns the merged Issue's id. */
async function reportedTwice(a = "ali", b = "sara") {
  spot++;
  const lat = 33.5 + spot * 0.01;
  const lng = 73.3 + spot * 0.01;
  let issueId = 0;
  for (const who of [`${a}${spot}`, `${b}${spot}`]) {
    await citizen(who);
    const f = new FormData();
    f.set("lat", String(lat));
    f.set("lng", String(lng));
    f.set("image", new File([new Uint8Array([1, 2, 3])], "p.jpg", { type: "image/jpeg" }));
    const res = await submitReport(new Request("http://test/api/reports", { method: "POST", body: f }));
    expect(res.status).toBe(200);
    issueId = (await res.json()).issueId;
  }
  return issueId;
}
const reporters = (n = spot) => [`ali${n}@gmail.com`, `sara${n}@gmail.com`];

const afterPhoto = (note?: string, withPhoto = true) => {
  const f = new FormData();
  if (withPhoto) f.set("afterImage", new File([new Uint8Array([4, 5, 6])], "after.jpg", { type: "image/jpeg" }));
  if (note !== undefined) f.set("note", note);
  return new Request("http://test/x", { method: "POST", body: f });
};

const act = {
  assign: (n: number, office = roads) => {
    authority();
    return assign(n, office);
  },
  start: (n: number) => start(json({}), id(n)),
  sendBack: (n: number, reason = "Not our area") => sendBack(json({ reason }), id(n)),
  fix: (n: number, note = "Pothole filled") => fix(afterPhoto(note), id(n)),
  confirm: (n: number) => confirm(json({}), id(n)),
  reject: (n: number, comment = "The pothole is still there") => reject(json({ comment }), id(n)),
};

const issue = async (n: number) => {
  const res = await getIssue(new Request("http://test/x"), id(n));
  return res.status === 200 ? await res.json() : null;
};
const status = async (n: number) => {
  authority();
  return (await issue(n))?.issue.status as string;
};
const errorOf = async (res: Response) => ({ status: res.status, error: (await res.json()).error });

/** Moves a fresh Issue to the given state the legal way. */
async function issueIn(state: "open" | "assigned" | "in_progress" | "fixed" | "resolved" | "closed_unconfirmed") {
  const n = await reportedTwice();
  if (state === "open") return n;
  expect((await act.assign(n)).status).toBe(200);
  if (state === "assigned") return n;
  crew();
  expect((await act.start(n)).status).toBe(200);
  if (state === "in_progress") return n;
  expect((await act.fix(n)).status).toBe(200);
  if (state === "fixed") return n;
  if (state === "resolved") {
    signInAs(reporters()[0]);
    expect((await act.confirm(n)).status).toBe(200);
    return n;
  }
  advanceClock(7 * 86_400_000 + 60_000);
  expect(await status(n)).toBe("closed_unconfirmed");
  return n;
}

// ---------------------------------------------------------------------------
// My jobs
// ---------------------------------------------------------------------------
describe("My jobs", () => {
  it("shows an Office only its own Issues", async () => {
    const mine = await issueIn("assigned");
    const theirs = await reportedTwice();
    expect((await act.assign(theirs, otherRoads)).status).toBe(200);

    const idsFor = async (email: string) => {
      signInAs(email);
      const res = await jobs();
      expect(res.status).toBe(200);
      return ((await res.json()).jobs as { id: number }[]).map((j) => j.id);
    };
    const one = await idsFor("crew-1@gov.pk");
    expect(one).toContain(mine);
    expect(one).not.toContain(theirs);
    expect(await idsFor("elsewhere@gov.pk")).toContain(theirs);
  });
});

// ---------------------------------------------------------------------------
// Assigned: start work, send back
// ---------------------------------------------------------------------------
describe("Assigned", () => {
  it("Office staff of that Office start work, and the Issue becomes In progress on the public timeline", async () => {
    const n = await issueIn("assigned");
    crew();
    expect((await act.start(n)).status).toBe(200);
    authority();
    const data = await issue(n);
    expect(data.issue.status).toBe("in_progress");
    expect(data.events.map((e: { kind: string }) => e.kind)).toContain("in_progress");
  });

  it("Office staff of another Office cannot start work or send it back", async () => {
    const n = await issueIn("assigned");
    signInAs("elsewhere@gov.pk");
    expect(await errorOf(await act.start(n))).toEqual({ status: 403, error: "forbidden" });
    expect(await errorOf(await act.sendBack(n))).toEqual({ status: 403, error: "forbidden" });
    expect(await status(n)).toBe("assigned");
  });

  it("sending back needs a reason, returns the Issue to Open with no Office, and puts the reason on the timeline", async () => {
    const n = await issueIn("assigned");
    crew();
    expect(await errorOf(await act.sendBack(n, "  "))).toEqual({ status: 400, error: "invalid_reason" });
    expect((await act.sendBack(n, "Not our area, this is CDA land")).status).toBe(200);
    authority();
    const data = await issue(n);
    expect(data.issue).toMatchObject({ status: "open", office_id: null });
    expect(data.events.at(-1)).toMatchObject({ kind: "sent_back" });
    expect(data.events.at(-1).message).toContain("Not our area, this is CDA land");

    // The Authority can assign it again; the Office that sent it back no longer sees it.
    crew();
    expect(((await (await jobs()).json()).jobs as { id: number }[]).map((j) => j.id)).not.toContain(n);
    expect(await errorOf(await act.start(n))).toEqual({ status: 403, error: "forbidden" });
    expect((await act.assign(n, otherRoads)).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// In progress: record a Fix
// ---------------------------------------------------------------------------
describe("Recording a Fix", () => {
  it("needs an after-repair photo", async () => {
    const n = await issueIn("in_progress");
    crew();
    expect(await errorOf(await fix(afterPhoto("done", false), id(n)))).toEqual({ status: 400, error: "photo_required" });
    expect(await status(n)).toBe("in_progress");
  });

  it("makes the Issue Fixed with the photo and note, and emails every Citizen who reported it", async () => {
    const n = await issueIn("in_progress");
    crew();
    expect((await act.fix(n, "Filled and re-asphalted")).status).toBe(200);
    authority();
    const data = await issue(n);
    expect(data.issue).toMatchObject({
      status: "fixed",
      after_image: "https://photos.test/fixed.jpg",
      fix_note: "Filled and re-asphalted",
      fixed_at: NOW.toISOString(),
    });
    expect(data.events.at(-1).kind).toBe("fixed");
    const mail = app.mail.sent.filter((m) => m.subject.startsWith("Fixed"));
    expect(mail).toHaveLength(1);
    expect(mail[0].to.sort()).toEqual(reporters().sort());
    expect(mail[0].body).toContain("/track");
  });

  it("is allowed without a note", async () => {
    const n = await issueIn("in_progress");
    crew();
    expect((await fix(afterPhoto(undefined), id(n))).status).toBe(200);
  });

  it("cannot be recorded by another Office", async () => {
    const n = await issueIn("in_progress");
    signInAs("elsewhere@gov.pk");
    expect(await errorOf(await act.fix(n))).toEqual({ status: 403, error: "forbidden" });
  });
});

// ---------------------------------------------------------------------------
// Fixed: the Citizen answers
// ---------------------------------------------------------------------------
describe("My reports", () => {
  it("shows the reporting Citizen the Fixed status, the after-photo and the timeline", async () => {
    const n = await issueIn("fixed");
    signInAs(reporters()[1]);
    const { reports } = await (await myReports()).json();
    const row = reports.find((r: { issue_id: number }) => r.issue_id === n);
    expect(row).toMatchObject({ issue_status: "fixed", issue_after_image: "https://photos.test/fixed.jpg", issue_fix_note: "Pothole filled" });
    expect(row.issue_events.map((e: { kind: string }) => e.kind)).toEqual(
      expect.arrayContaining(["created", "merged", "assigned", "in_progress", "fixed"]),
    );
  });
});

describe("Confirming a Fix", () => {
  it("makes the Issue Resolved and emails the reporting Citizens", async () => {
    const n = await issueIn("fixed");
    app.mail.sent.length = 0;
    signInAs(reporters()[1]);
    expect((await act.confirm(n)).status).toBe(200);
    authority();
    const data = await issue(n);
    expect(data.issue).toMatchObject({ status: "resolved", resolved_at: NOW.toISOString() });
    expect(data.events.at(-1).kind).toBe("resolved");
    expect(app.mail.sent).toHaveLength(1);
    expect(app.mail.sent[0].subject).toMatch(/^Resolved/);
    expect(app.mail.sent[0].to.sort()).toEqual(reporters().sort());
  });

  it("is only for a Citizen who reported the Issue", async () => {
    const n = await issueIn("fixed");
    await citizen("bystander");
    expect(await errorOf(await act.confirm(n))).toEqual({ status: 403, error: "forbidden" });
    expect(await errorOf(await act.reject(n))).toEqual({ status: 403, error: "forbidden" });
    expect(await status(n)).toBe("fixed");
  });
});

describe("Rejecting a Fix", () => {
  it("needs a comment, returns the Issue to In progress without the after-photo, and shows the comment to the Office", async () => {
    const n = await issueIn("fixed");
    signInAs(reporters()[0]);
    expect(await errorOf(await act.reject(n, ""))).toEqual({ status: 400, error: "invalid_comment" });
    expect((await act.reject(n, "Only half of it was filled")).status).toBe(200);

    authority();
    const data = await issue(n);
    expect(data.issue).toMatchObject({ status: "in_progress", after_image: null, fixed_at: null });
    expect(data.events.at(-1)).toMatchObject({ kind: "rejected" });
    expect(data.events.at(-1).message).toContain("Only half of it was filled");

    crew();
    const job = ((await (await jobs()).json()).jobs as { id: number; rejection: string | null }[]).find((j) => j.id === n);
    expect(job?.rejection).toContain("Only half of it was filled");

    // The Office fixes it again, and the comment no longer shows.
    expect((await act.fix(n)).status).toBe(200);
    const again = ((await (await jobs()).json()).jobs as { id: number; rejection: string | null }[]).find((j) => j.id === n);
    expect(again?.rejection).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fixed, 7 days later: Closed unconfirmed
// ---------------------------------------------------------------------------
describe("Unconfirmed closure", () => {
  it("closes a Fix nobody answered 7 days later, when Issues are read, and emails the reporting Citizens once", async () => {
    const n = await issueIn("fixed");
    app.mail.sent.length = 0;

    advanceClock(7 * 86_400_000 - 60_000);
    expect(await status(n)).toBe("fixed");
    expect(app.mail.sent).toHaveLength(0);

    advanceClock(2 * 60_000);
    const list = (await (await listIssues(new Request("http://test/api/issues"))).json()).issues as { id: number; status: string }[];
    expect(list.find((i) => i.id === n)?.status).toBe("closed_unconfirmed");
    const data = await issue(n);
    expect(data.issue.closed_at).toBe(new Date(NOW.getTime() + 7 * 86_400_000).toISOString());
    expect(data.issue.resolved_at).toBeNull();
    expect(data.events.at(-1).kind).toBe("closed_unconfirmed");

    await issue(n);
    // Other tests' Fixes close at the same moment, so count only the mail to this Issue's reporters.
    const mail = app.mail.sent.filter((m) => m.subject.startsWith("Closed") && m.to.includes(reporters()[0]));
    expect(mail).toHaveLength(1);
    expect(mail[0].to.sort()).toEqual(reporters().sort());

    // Too late to answer now.
    signInAs(reporters()[0]);
    expect(await errorOf(await act.confirm(n))).toEqual({ status: 409, error: "conflict" });
  });

  it("applies even when the first thing after the 7 days is a Citizen answering", async () => {
    const n = await issueIn("fixed");
    advanceClock(8 * 86_400_000);
    signInAs(reporters()[0]);
    expect(await errorOf(await act.reject(n))).toEqual({ status: 409, error: "conflict" });
    expect(await status(n)).toBe("closed_unconfirmed");
  });
});

// ---------------------------------------------------------------------------
// Every command in a state the table does not allow answers "conflict" and changes nothing
// ---------------------------------------------------------------------------
describe("illegal commands answer conflict", () => {
  type State = Parameters<typeof issueIn>[0];
  type Command = "start" | "sendBack" | "fix" | "confirm" | "reject" | "assign";
  const allowedFrom: Record<Command, State> = {
    assign: "open",
    start: "assigned",
    sendBack: "assigned",
    fix: "in_progress",
    confirm: "fixed",
    reject: "fixed",
  };
  // Office commands on an Open Issue are "forbidden" (it belongs to no Office), tested above.
  const states: State[] = ["assigned", "in_progress", "fixed", "resolved", "closed_unconfirmed"];
  const signInFor = (c: Command) => {
    if (c === "assign") authority();
    else if (c === "confirm" || c === "reject") signInAs(reporters()[0]);
    else crew();
  };
  for (const state of states)
    for (const command of Object.keys(allowedFrom) as Command[])
      if (allowedFrom[command] !== state)
        it(`${command} on a ${state} Issue`, async () => {
          const n = await issueIn(state);
          signInFor(command);
          expect(await errorOf(await act[command](n))).toEqual({ status: 409, error: "conflict" });
          expect(await status(n)).toBe(state);
        });

  it("confirm and reject on an Open Issue", async () => {
    const n = await issueIn("open");
    signInAs(reporters()[0]);
    expect(await errorOf(await act.confirm(n))).toEqual({ status: 409, error: "conflict" });
    expect(await errorOf(await act.reject(n))).toEqual({ status: 409, error: "conflict" });
  });
});

// ---------------------------------------------------------------------------
// Demo and real stay apart
// ---------------------------------------------------------------------------
describe("Demo data", () => {
  it("the Demo Office runs its own jobs through to Fixed, and sends no real email", async () => {
    // The Demo Authority sends the Demo Office a contract for an Open Demo road Issue, and it accepts.
    signInDemo("authority");
    const offices = (await (await listOffices()).json()).offices as { id: number; staff: { email: string }[] }[];
    const demoOffice = offices.find((o) => o.staff.some((s) => s.email === "demo.office@invisible.city"))!;
    const open = (await (await listIssues(new Request("http://test/api/issues?status=open&category=road_damage"))).json()).issues;
    expect((await assign(open[0].id, demoOffice.id)).status).toBe(200);

    signInDemo("office");
    const { jobs: list } = await (await jobs()).json();
    const job = (list as { id: number; status: string }[]).find((j) => j.id === open[0].id && j.status === "assigned");
    expect(job).toBeDefined();
    expect((await act.start(job!.id)).status).toBe(200);
    expect((await act.fix(job!.id)).status).toBe(200);
    expect(app.mail.sent).toHaveLength(0);

    // A real Office cannot touch a Demo Issue.
    crew();
    expect((await act.start(job!.id)).status).toBe(404);
  });
});

describe("a Fix by a Business that was then revoked", () => {
  it("if rejected, goes back to Open for the Authority, who can offer it to another Business", async () => {
    const leaving = await newOffice("Leaving Roads", 33.72, 73.05);
    await staff(leaving, "leaving@gov.pk");
    const n = await reportedTwice();
    expect((await act.assign(n, leaving)).status).toBe(200);
    signInAs("leaving@gov.pk");
    expect((await act.start(n)).status).toBe(200);
    expect((await act.fix(n)).status).toBe(200);
    signInAs(SUPER_ADMIN);
    expect((await revokeBusiness(new Request("http://test/x", { method: "DELETE" }), id(leaving))).status).toBe(200);
    expect(await status(n)).toBe("fixed"); // the Citizens can still answer

    signInAs(reporters()[0]);
    expect((await act.reject(n)).status).toBe(200);
    const { issue: after, events } = await issue(n);
    expect(after).toMatchObject({ status: "open", office_id: null, after_image: null, fix_note: null, fixed_at: null });
    expect(events.slice(-2).map((e: { kind: string }) => e.kind)).toEqual(["rejected", "sent_back"]);
    expect((await act.assign(n)).status).toBe(200);
    expect(await status(n)).toBe("assigned");

    // The new Business is not shown the Rejection of somebody else's Fix.
    crew();
    expect((await act.start(n)).status).toBe(200);
    const { jobs: list } = await (await jobs()).json();
    expect(list.find((j: { id: number }) => j.id === n)).toMatchObject({ status: "in_progress", rejection: null });
  });
});
