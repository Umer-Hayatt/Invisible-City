import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { GET as myReports, POST as submitReport } from "../app/api/reports/route";
import { DELETE as deleteReport } from "../app/api/reports/[id]/route";
import { setAnalyzer } from "../lib/ai";
import { advanceClock, setClock } from "../lib/clock";
import { setSession } from "../lib/session";
import { AIAnalysis } from "../lib/types";
import { ctx, NOW, signInAs, signInDemo, startTestApp } from "./helpers";

let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
});
afterAll(() => app.stop());

const reading = (over: Partial<AIAnalysis> = {}): AIAnalysis => ({
  is_civic_issue: true,
  category: "road_damage",
  severity: "high",
  confidence: 0.9,
  title: "Deep pothole",
  summary: "A deep pothole on the road.",
  hazards: [],
  source: "gemini",
  ...over,
});
let scripted: AIAnalysis;
beforeEach(() => {
  process.env.DEMO_MODE = "true";
  setSession(null);
  setClock(NOW);
  scripted = reading();
  setAnalyzer(async () => scripted);
});
afterEach(() => setAnalyzer(null));

const put = (data: unknown) =>
  new Request("http://test/api/me/profile", { method: "PUT", body: JSON.stringify(data), headers: { "content-type": "application/json" } });
/** A real Citizen with a complete profile. */
async function citizen(name: string) {
  signInAs(`${name}@gmail.com`);
  expect((await saveProfile(put({ displayName: name, phone: "0300 1234567" }))).status).toBe(200);
}
const form = (lat: number, lng: number, extra: { photo?: boolean; hint?: string } = {}) => {
  const f = new FormData();
  f.set("lat", String(lat));
  f.set("lng", String(lng));
  f.set("description", "Deep pothole in the road");
  if (extra.photo !== false) f.set("image", new File([new Uint8Array([1, 2, 3])], "p.jpg", { type: "image/jpeg" }));
  if (extra.hint) f.set("categoryHint", extra.hint);
  return new Request("http://test/api/reports", { method: "POST", body: f });
};
const send = (lat: number, lng: number, extra?: { photo?: boolean; hint?: string }) => submitReport(form(lat, lng, extra));
const mine = async () => (await (await myReports()).json()).reports as { id: number; issue_id: number }[];
const issueOf = async (id: number) => {
  const res = await getIssue(new Request("http://test/x"), ctx({ id: String(id) }));
  return res.status === 200 ? (await res.json()).issue : null;
};
const remove = (id: number) => deleteReport(new Request("http://test/x", { method: "DELETE" }), ctx({ id: String(id) }));

describe("sending a Report", () => {
  it("needs a photo", async () => {
    await citizen("photoless");
    const res = await send(33.7, 73.1, { photo: false });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("photo_required");
  });

  it("refuses a photo that is not a civic problem, and stores nothing", async () => {
    await citizen("selfie");
    scripted = reading({ is_civic_issue: false, category: "other", severity: "low" });
    const before = app.photos.uploads;
    const res = await send(33.71, 73.11);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("not_civic");
    expect(await mine()).toHaveLength(0);
    expect(app.photos.uploads).toBe(before);
  });

  it("lets the Citizen change the AI's Category before sending", async () => {
    await citizen("chooser");
    const res = await send(33.72, 73.12, { hint: "garbage" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis.category).toBe("garbage");
    expect(body.issue.category).toBe("garbage");
  });

  it("is tied to the signed-in Citizen", async () => {
    await citizen("owner");
    await send(33.73, 73.13);
    expect(await mine()).toHaveLength(1);
    await citizen("someone-else");
    expect(await mine()).toHaveLength(0);
  });
});

describe("the daily limit", () => {
  it("allows 10 Reports in 24 hours, refuses the 11th, and allows more a day later", async () => {
    await citizen("busy");
    for (let i = 0; i < 10; i++) expect((await send(34 + i * 0.2, 72)).status).toBe(200);
    const eleventh = await send(37, 72);
    expect(eleventh.status).toBe(429);
    expect((await eleventh.json()).error).toBe("daily_limit");
    advanceClock(24 * 3_600_000 + 1000);
    expect((await send(37, 72)).status).toBe(200);
  });

  it("is not dodged by deleting Reports", async () => {
    await citizen("deleter");
    for (let i = 0; i < 10; i++) expect((await send(40 + i * 0.2, 71)).status).toBe(200);
    for (const r of await mine()) await remove(r.id);
    expect((await send(43, 71)).status).toBe(429);
  });

  it("also applies to Demo accounts", async () => {
    signInDemo("citizen");
    let refused = false;
    for (let i = 0; i < 12 && !refused; i++) {
      const res = await send(20 + i * 0.5, 60);
      if (res.status === 429) refused = true;
      else expect(res.status).toBe(200);
    }
    expect(refused).toBe(true);
  });
});

describe("the same problem reported twice", () => {
  it("merges a second Citizen's Report into one Issue", async () => {
    await citizen("first");
    const a = await (await send(33.6, 73.2)).json();
    await citizen("second");
    const b = await (await send(33.6, 73.2)).json();
    expect(b.issueId).toBe(a.issueId);
    expect(b.duplicate).not.toBeNull();
    expect((await issueOf(a.issueId)).report_count).toBe(2);
  });

  it("tells a Citizen who already reported it, and does not count them twice", async () => {
    await citizen("repeat");
    const first = await (await send(33.5, 73.3)).json();
    const uploads = app.photos.uploads;
    const again = await send(33.5, 73.3);
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe("already_reported");
    expect((await issueOf(first.issueId)).report_count).toBe(1);
    expect(await mine()).toHaveLength(1);
    expect(app.photos.uploads).toBe(uploads);
  });
});

describe("deleting your own Report", () => {
  it("removes the Issue when it was the only Report", async () => {
    await citizen("regret");
    const { issueId } = await (await send(33.4, 73.4)).json();
    const [r] = await mine();
    expect((await remove(r.id)).status).toBe(200);
    expect(await mine()).toHaveLength(0);
    expect(await issueOf(issueId)).toBeNull();
  });

  it("keeps the Issue and lowers its count when others reported it too", async () => {
    await citizen("stays");
    const { issueId } = await (await send(33.3, 73.5)).json();
    await citizen("leaves");
    await send(33.3, 73.5);
    const [r] = await mine();
    expect((await remove(r.id)).status).toBe(200);
    expect((await issueOf(issueId)).report_count).toBe(1);
    // having withdrawn, they may report it again
    expect((await send(33.3, 73.5)).status).toBe(200);
  });

  it("is refused once the Issue is no longer Open", async () => {
    await citizen("toolate");
    const { issueId } = await (await send(33.2, 73.6)).json();
    await app.sql.query("UPDATE issues SET status = 'assigned' WHERE id = $1", [issueId]);
    const [r] = await mine();
    const res = await remove(r.id);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("not_open");
    expect((await issueOf(issueId)).report_count).toBe(1);
  });

  it("cannot delete another Citizen's Report", async () => {
    await citizen("victim");
    await send(33.1, 73.7);
    const [r] = await mine();
    await citizen("intruder");
    expect((await remove(r.id)).status).toBe(404);
    await citizen("victim");
    expect(await mine()).toHaveLength(1);
  });

  it("is for signed-in Citizens only", async () => {
    expect((await remove(1)).status).toBe(401);
  });
});

describe("Vision AI chain: Gemini, then Groq, then the keyword guess", () => {
  const providerReply = (source: "gemini" | "groq") => {
    const out = JSON.stringify({ ...reading({ title: `from ${source}` }), source: undefined });
    return source === "gemini"
      ? { candidates: [{ content: { parts: [{ text: out }] } }] }
      : { choices: [{ message: { content: out } }] };
  };
  const stubFetch = (gemini: boolean, groq: boolean) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const isGemini = String(url).includes("generativelanguage");
        const ok = isGemini ? gemini : groq;
        return new Response(JSON.stringify(ok ? providerReply(isGemini ? "gemini" : "groq") : { error: "down" }), { status: ok ? 200 : 500 });
      }),
    );
  beforeEach(() => {
    setAnalyzer(null);
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.GROQ_API_KEY = "test-groq";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
  });

  it("uses Gemini when it answers", async () => {
    await citizen("g1");
    stubFetch(true, true);
    expect((await (await send(32.1, 73.1)).json()).analysis.source).toBe("gemini");
  });

  it("falls back to Groq when Gemini is down", async () => {
    await citizen("g2");
    stubFetch(false, true);
    expect((await (await send(32.2, 73.1)).json()).analysis.source).toBe("groq");
  });

  it("falls back to the keyword guess when both are down, and the Report still goes through", async () => {
    await citizen("g3");
    stubFetch(false, false);
    const res = await send(32.3, 73.1);
    expect(res.status).toBe(200);
    expect((await res.json()).analysis.source).toBe("heuristic");
  });
});
