import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as contracts } from "../app/api/contracts/route";
import { POST as answer } from "../app/api/contracts/[id]/route";
import { POST as confirm } from "../app/api/issues/[id]/confirm/route";
import { POST as fix } from "../app/api/issues/[id]/fix/route";
import { POST as start } from "../app/api/issues/[id]/start/route";
import { GET as listIssues } from "../app/api/issues/route";
import { GET as jobs } from "../app/api/office/jobs/route";
import { GET as offices } from "../app/api/offices/route";
import { GET as myReports } from "../app/api/reports/route";
import { GET as city } from "../app/api/city/route";
import { setSession } from "../lib/session";
import { ctx, signInDemo, startTestApp } from "./helpers";

/**
 * Ticket 09: a judge who opens the Demo can play every role from the first click. The seed leaves the Demo
 * Office one job of each kind, and the Demo Citizen a Fix to answer.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
});
afterAll(() => app.stop());
beforeEach(() => setSession(null));

const id = (n: number) => ctx({ id: String(n) });
const post = () => new Request("http://test/x", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
interface Job { id: number; status: string; office_id: number }

describe("the seeded demo story", () => {
  it("gives every Issue to a Business of its Category's Department", async () => {
    signInDemo("authority");
    const { offices: all } = (await (await offices()).json()) as { offices: { id: number; department: string }[] };
    const { issues } = (await (await listIssues(new Request("http://test/api/issues"))).json()) as {
      issues: { category: string; department: string; office_id: number | null }[];
    };
    const held = issues.filter((i) => i.office_id);
    expect(held.some((i) => i.category === "blocked_footpath")).toBe(true);
    const wrong = held.filter((i) => all.find((o) => o.id === i.office_id)?.department !== i.department);
    expect(wrong.map((i) => i.category)).toEqual([]);
  });

  it("gives the Demo Office an Assigned, an In progress and a Fixed job", async () => {
    signInDemo("office");
    const { jobs: list } = (await (await jobs()).json()) as { jobs: Job[] };
    // Its unfinished work; it may also have Resolved jobs from before (the Demo Business is a busy office).
    const unfinished = list.map((j) => j.status).filter((s) => s !== "resolved" && s !== "closed_unconfirmed");
    expect(unfinished.sort()).toEqual(["assigned", "fixed", "in_progress"]);
  });

  it("gives the Demo Office a contract to answer, and accepting it makes the Issue its job", async () => {
    signInDemo("office");
    const list = async () => (await (await contracts(new Request("http://test/x"))).json()).contracts as { id: number; issue_id: number; status: string }[];
    const [waiting] = (await list()).filter((c) => c.status === "sent");
    expect(waiting).toBeTruthy();
    const accept = new Request("http://test/x", { method: "POST", body: JSON.stringify({ decision: "accepted" }) });
    expect((await answer(accept, id(waiting.id))).status).toBe(200);
    const { jobs: mine } = (await (await jobs()).json()) as { jobs: Job[] };
    expect(mine.find((j) => j.id === waiting.issue_id)?.status).toBe("assigned");
    expect(app.mail.sent).toHaveLength(0);
  });

  it("lets the Demo Citizen confirm the Fix they reported, and the city figures move", async () => {
    signInDemo("citizen");
    const { reports } = await (await myReports()).json();
    const waiting = reports.find((r: { issue_status: string }) => r.issue_status === "fixed");
    expect(waiting).toBeTruthy();
    const before = (await (await city()).json()).figures.resolved;

    expect((await confirm(post(), id(waiting.issue_id))).status).toBe(200);
    expect((await (await city()).json()).figures.resolved).toBe(before + 1);
    expect(app.mail.sent).toHaveLength(0); // Demo Issues never send real email
  });

  it("lets the Demo Office start work and record a Fix", async () => {
    signInDemo("office");
    const { jobs: list } = (await (await jobs()).json()) as { jobs: Job[] };
    const assigned = list.find((j) => j.status === "assigned")!;
    const working = list.find((j) => j.status === "in_progress")!;
    expect((await start(post(), id(assigned.id))).status).toBe(200);
    const f = new FormData();
    f.set("afterImage", new File([new Uint8Array([1, 2, 3])], "after.jpg", { type: "image/jpeg" }));
    expect((await fix(new Request("http://test/x", { method: "POST", body: f }), id(working.id))).status).toBe(200);
  });
});
