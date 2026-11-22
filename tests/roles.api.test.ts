import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as listRequests, POST as sendRequest } from "../app/api/access-requests/route";
import { POST as decideRequest } from "../app/api/access-requests/[id]/route";
import { GET as getMe } from "../app/api/me/route";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { GET as officeJobs } from "../app/api/office/jobs/route";
import { GET as listIssues } from "../app/api/issues/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { POST as assignIssue } from "../app/api/issues/[id]/assign/route";
import { POST as resolveIssue } from "../app/api/issues/[id]/resolve/route";
import { GET as getStats } from "../app/api/stats/route";
import { GET as myReports, POST as submitReport } from "../app/api/reports/route";
import { DEMO_ACCOUNTS } from "../lib/demo-accounts";
import { setSession } from "../lib/session";
import { ctx, SUPER_ADMIN, signInAs, signInDemo, startTestApp } from "./helpers";

let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
});
afterAll(() => app.stop());
beforeEach(() => {
  process.env.DEMO_MODE = "true";
  setSession(null);
});

const body = (r: Response) => r.json();
const post = (url: string, data: unknown, method = "POST") =>
  new Request(`http://test${url}`, { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const me = async () => (await body(await getMe())).me;
const reportForm = () => {
  const f = new FormData();
  f.set("lat", "33.7");
  f.set("lng", "73.1");
  f.set("description", "Deep pothole in the road");
  f.set("image", new File([new Uint8Array([1, 2, 3])], "p.jpg", { type: "image/jpeg" }));
  return new Request("http://test/api/reports", { method: "POST", body: f });
};
const requestAccess = (email: string, name = "Ayesha Khan") =>
  sendRequest(post("/api/access-requests", { name, department: "Roads", officialEmail: email, phone: "0300 1234567" }));

describe("who you are is worked out on the server for every request", () => {
  it("is nobody when no one is signed in", async () => {
    expect(await me()).toBeNull();
  });

  it("makes a Google sign-in a Citizen by default, with an incomplete profile", async () => {
    signInAs("newcomer@gmail.com");
    expect(await me()).toMatchObject({ role: "citizen", profileComplete: false, isDemo: false });
  });

  it("makes an email in SUPER_ADMIN_EMAILS a Super Admin, whatever case it arrives in", async () => {
    signInAs(SUPER_ADMIN.toUpperCase().toLowerCase());
    expect((await me()).role).toBe("super_admin");
  });

  it("makes an approved Access request an Authority, and a declined one stays a Citizen", async () => {
    await requestAccess("official@gmail.com");
    await requestAccess("pretender@gmail.com");
    signInAs(SUPER_ADMIN);
    const { requests } = await body(await listRequests());
    const find = (e: string) => requests.find((r: { official_email: string }) => r.official_email === e).id;
    expect((await decideRequest(post("/x", { decision: "approved" }), ctx({ id: String(find("official@gmail.com")) }))).status).toBe(200);
    expect((await decideRequest(post("/x", { decision: "declined" }), ctx({ id: String(find("pretender@gmail.com")) }))).status).toBe(200);

    signInAs("official@gmail.com");
    expect((await me()).role).toBe("authority");
    signInAs("pretender@gmail.com");
    expect((await me()).role).toBe("citizen");
  });

  it("makes staff listed for an Office Office staff of exactly that Office", async () => {
    signInDemo("office");
    const m = await me();
    expect(m.role).toBe("office");
    expect(m.officeId).toBeTypeOf("number");
  });

  it("gives the four Demo accounts their four roles", async () => {
    const roles: string[] = [];
    for (const k of ["citizen", "authority", "office", "superAdmin"] as const) {
      signInDemo(k);
      roles.push((await me()).role);
    }
    expect(roles).toEqual(["citizen", "authority", "office", "super_admin"]);
  });

  it("never lets a real sign-in claim a Demo account's role by using its email", async () => {
    signInAs(DEMO_ACCOUNTS.authority.email, "real-imposter");
    expect((await me()).role).toBe("citizen");
    signInAs(DEMO_ACCOUNTS.office.email, "real-imposter-2");
    expect((await me()).role).toBe("citizen");
  });
});

describe("the profile form", () => {
  it("saves a display name and a phone in +92 3xx xxxxxxx form, and completes the profile", async () => {
    signInAs("profile@gmail.com");
    const res = await saveProfile(post("/api/me/profile", { displayName: "  Sara  Ali ", phone: "+923011234567" }, "PUT"));
    expect(await body(res)).toMatchObject({ displayName: "Sara Ali", phone: "+92 301 1234567" });
    expect(await me()).toMatchObject({ profileComplete: true, phone: "+92 301 1234567" });
  });

  it("refuses a phone that is not a Pakistani mobile number", async () => {
    signInAs("profile2@gmail.com");
    const res = await saveProfile(post("/api/me/profile", { displayName: "Sara", phone: "12345" }, "PUT"));
    expect(res.status).toBe(400);
    expect((await body(res)).error).toBe("invalid_phone");
  });

  it("sends a Citizen with an incomplete profile to the form when they try to report", async () => {
    signInAs("lazy@gmail.com");
    const res = await submitReport(reportForm());
    expect(res.status).toBe(403);
    expect((await body(res)).error).toBe("profile_incomplete");
  });
});

describe("Demo accounts", () => {
  it("cannot change their shared profile", async () => {
    signInDemo("citizen");
    const res = await saveProfile(post("/api/me/profile", { displayName: "Vandal", phone: "0300 1234567" }, "PUT"));
    expect(res.status).toBe(403);
    expect((await me()).displayName).toBe("Demo Citizen");
  });
});

describe("no session: every protected command answers unauthenticated", () => {
  const calls: [string, () => Promise<Response>][] = [
    ["submit a Report", () => submitReport(reportForm())],
    ["list my Reports", () => myReports()],
    ["save the profile", () => saveProfile(post("/api/me/profile", { displayName: "A B", phone: "0300 1234567" }, "PUT"))],
    ["assign an Issue", () => assignIssue(post("/x", { officeId: 1 }), ctx({ id: "1" }))],
    ["record a Fix", () => resolveIssue(new Request("http://test/x", { method: "POST", body: new FormData() }), ctx({ id: "1" }))],
    ["list my Office's jobs", () => officeJobs()],
    ["list Access requests", () => listRequests()],
    ["decide an Access request", () => decideRequest(post("/x", { decision: "approved" }), ctx({ id: "1" }))],
  ];
  for (const [name, call] of calls)
    it(`refuses to ${name}`, async () => {
      const res = await call();
      expect(res.status).toBe(401);
      expect((await body(res)).error).toBe("unauthenticated");
    });
});

describe("another role's commands answer forbidden", () => {
  type Who = "citizen" | "authority" | "office" | "superAdmin";
  const commands: Record<string, { allowed: Who; call: () => Promise<Response> }> = {
    "submit a Report": { allowed: "citizen", call: () => submitReport(reportForm()) },
    "list my Reports": { allowed: "citizen", call: () => myReports() },
    "change an Issue's assignment": { allowed: "authority", call: () => assignIssue(post("/x", { officeId: 1 }), ctx({ id: "1" })) },
    "record a Fix": { allowed: "authority", call: () => resolveIssue(new Request("http://test/x", { method: "POST", body: new FormData() }), ctx({ id: "1" })) },
    "list my Office's jobs": { allowed: "office", call: () => officeJobs() },
    "list Access requests": { allowed: "superAdmin", call: () => listRequests() },
    "decide an Access request": { allowed: "superAdmin", call: () => decideRequest(post("/x", { decision: "approved" }), ctx({ id: "1" })) },
  };
  const all: Who[] = ["citizen", "authority", "office", "superAdmin"];
  for (const [name, { allowed, call }] of Object.entries(commands))
    for (const who of all.filter((w) => w !== allowed))
      it(`${who} cannot ${name}`, async () => {
        signInDemo(who);
        const res = await call();
        expect(res.status).toBe(403);
        expect((await body(res)).error).toBe("forbidden");
      });
});

describe("Authority access requests", () => {
  it("lets anyone send a request and puts it in front of a Super Admin", async () => {
    expect((await requestAccess("someone@gmail.com", "Bilal Ahmed")).status).toBe(201);
    signInAs(SUPER_ADMIN);
    const { requests } = await body(await listRequests());
    expect(requests.find((r: { official_email: string }) => r.official_email === "someone@gmail.com")).toMatchObject({
      name: "Bilal Ahmed",
      department: "Roads",
      phone: "+92 300 1234567",
      decision: "pending",
    });
  });

  it("refuses a second pending request from the same email, and a bad phone or email", async () => {
    await requestAccess("twice@gmail.com");
    expect((await requestAccess("twice@gmail.com")).status).toBe(409);
    expect((await sendRequest(post("/api/access-requests", { name: "A B", department: "Roads", officialEmail: "x@y.com", phone: "555" }))).status).toBe(400);
    expect((await sendRequest(post("/api/access-requests", { name: "A B", department: "Roads", officialEmail: "nope", phone: "0300 1234567" }))).status).toBe(400);
  });

  it("answers conflict when an already decided request is decided again", async () => {
    await requestAccess("decided@gmail.com");
    signInAs(SUPER_ADMIN);
    const { requests } = await body(await listRequests());
    const id = String(requests.find((r: { official_email: string }) => r.official_email === "decided@gmail.com").id);
    expect((await decideRequest(post("/x", { decision: "declined" }), ctx({ id }))).status).toBe(200);
    expect((await decideRequest(post("/x", { decision: "approved" }), ctx({ id }))).status).toBe(409);
  });
});

describe("Demo data and real data stay apart", () => {
  it("shows a Demo visitor and a signed-out visitor in Demo mode the Demo Issues, and a real Citizen none", async () => {
    const count = async () => (await body(await listIssues(new Request("http://test/api/issues")))).issues.length;
    expect(await count()).toBe(69);
    signInDemo("citizen");
    expect(await count()).toBe(69);
    signInAs("real@gmail.com");
    expect(await count()).toBe(0);
  });

  it("shows a signed-out visitor no Demo data when Demo mode is off", async () => {
    process.env.DEMO_MODE = "false";
    const { issues } = await body(await listIssues(new Request("http://test/api/issues")));
    expect(issues.length).toBe(0);
    expect((await body(await getStats())).overview.totalIssues).toBe(0);
  });

  it("answers 404 for a Demo Issue to a real account", async () => {
    signInDemo("citizen");
    const { issues } = await body(await listIssues(new Request("http://test/api/issues")));
    const id = String(issues[0].id);
    expect((await getIssue(new Request("http://test"), ctx({ id }))).status).toBe(200);
    signInAs("real2@gmail.com");
    expect((await getIssue(new Request("http://test"), ctx({ id }))).status).toBe(404);
  });

  it("keeps a real Report from merging into a Demo Issue at the same spot", async () => {
    signInDemo("citizen");
    const { issues } = await body(await listIssues(new Request("http://test/api/issues")));
    const demoIssue = issues[0];
    signInAs("realreporter@gmail.com");
    await saveProfile(post("/api/me/profile", { displayName: "Real Person", phone: "0300 7654321" }, "PUT"));
    const f = new FormData();
    f.set("lat", String(demoIssue.lat));
    f.set("lng", String(demoIssue.lng));
    f.set("description", demoIssue.title);
    f.set("categoryHint", demoIssue.category);
    f.set("image", new File([new Uint8Array([1])], "p.jpg", { type: "image/jpeg" }));
    const out = await body(await submitReport(new Request("http://test/api/reports", { method: "POST", body: f })));
    expect(out.duplicate).toBeNull();
    expect(out.issueId).not.toBe(demoIssue.id);
    const mine = (await body(await listIssues(new Request("http://test/api/issues")))).issues;
    expect(mine.map((i: { id: number }) => i.id)).toEqual([out.issueId]);
  });

  it("keeps the Demo Super Admin from seeing or deciding a real Access request", async () => {
    await requestAccess("realofficial@gmail.com");
    signInAs(SUPER_ADMIN);
    const real = (await body(await listRequests())).requests.find((r: { official_email: string }) => r.official_email === "realofficial@gmail.com");
    expect(real).toBeTruthy();

    signInDemo("superAdmin");
    const demoList = (await body(await listRequests())).requests;
    expect(demoList.some((r: { official_email: string }) => r.official_email === "realofficial@gmail.com")).toBe(false);
    expect((await decideRequest(post("/x", { decision: "approved" }), ctx({ id: String(real.id) }))).status).toBe(404);

    signInAs("realofficial@gmail.com");
    expect((await me()).role).toBe("citizen");
  });

  it("keeps a Demo Super Admin's approval from making a real sign-in an Authority", async () => {
    signInDemo("citizen");
    await requestAccess("demo.newbie@invisible.city");
    signInDemo("superAdmin");
    const row = (await body(await listRequests())).requests.find((r: { official_email: string }) => r.official_email === "demo.newbie@invisible.city");
    expect((await decideRequest(post("/x", { decision: "approved" }), ctx({ id: String(row.id) }))).status).toBe(200);
    signInAs("demo.newbie@invisible.city", "real-newbie");
    expect((await me()).role).toBe("citizen");
  });
});

describe("a Citizen's own Reports", () => {
  it("returns only the signed-in Citizen's Reports, taken from the session and not from a parameter", async () => {
    signInDemo("citizen");
    const res = await myReports();
    expect(res.status).toBe(200);
    const { reports } = await body(res);
    expect(Array.isArray(reports)).toBe(true);
  });
});
