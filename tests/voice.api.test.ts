import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { POST as submitReport } from "../app/api/reports/route";
import { POST as voice } from "../app/api/voice/route";
import { setAnalyzer } from "../lib/ai";
import { setSession } from "../lib/session";
import { setTranscriber } from "../lib/voice";
import { ctx, signInAs, startTestApp } from "./helpers";

/**
 * Ticket 08: a Citizen speaks a Report in Urdu. Gemini (faked here) returns Urdu text and an English
 * translation; the Report keeps both, and only an Authority or the assigned Office sees the Urdu original.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
const URDU = "سڑک پر بہت گہرا گڑھا ہے";
const ENGLISH = "There is a very deep pothole on the road";

beforeAll(async () => {
  app = await startTestApp();
  await app.sql.query(
    "INSERT INTO access_requests (name, official_email, decision, is_demo) VALUES ('Ayesha', 'official@gov.pk', 'approved', false)",
  );
});
afterAll(() => app.stop());
beforeEach(() => {
  setSession(null);
  delete process.env.GEMINI_API_KEY;
  setTranscriber(async () => ({ urdu: URDU, english: ENGLISH }));
  setAnalyzer(async (input) => ({
    is_civic_issue: true,
    category: "road_damage",
    severity: "high",
    confidence: 0.9,
    title: "Deep pothole",
    summary: input.description,
    hazards: [],
    source: "gemini",
  }));
});
afterEach(() => {
  setTranscriber(null);
  setAnalyzer(null);
});

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const recording = (type = "audio/webm;codecs=opus", bytes: Uint8Array<ArrayBuffer> = new Uint8Array([1, 2, 3, 4])) => {
  const f = new FormData();
  f.set("audio", new File([bytes], "voice", { type }));
  return new Request("http://test/api/voice", { method: "POST", body: f });
};
async function citizen(name = "noor") {
  signInAs(`${name}@gmail.com`);
  await saveProfile(json({ displayName: name, phone: "0300 1112223" }, "PUT"));
}
const errorOf = async (res: Response) => ({ status: res.status, error: (await res.json()).error });

describe("POST /api/voice", () => {
  it("returns the Urdu text and its English translation to a Citizen", async () => {
    await citizen();
    const res = await voice(recording());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ urdu: URDU, english: ENGLISH });
  });

  it("is for signed-in Citizens with a complete profile only", async () => {
    expect(await errorOf(await voice(recording()))).toEqual({ status: 401, error: "unauthenticated" });
    signInAs("official@gov.pk");
    expect(await errorOf(await voice(recording()))).toEqual({ status: 403, error: "forbidden" });
    signInAs("noprofile@gmail.com");
    expect(await errorOf(await voice(recording()))).toEqual({ status: 403, error: "profile_incomplete" });
  });

  it("says voice is off when there is no Gemini key", async () => {
    await citizen();
    setTranscriber(null);
    expect(await errorOf(await voice(recording()))).toEqual({ status: 503, error: "voice_unavailable" });
  });

  it("refuses empty, oversized or unknown recordings, and says when nothing was said", async () => {
    await citizen();
    expect(await errorOf(await voice(recording("audio/webm", new Uint8Array())))).toEqual({ status: 400, error: "no_speech" });
    expect(await errorOf(await voice(recording("audio/webm", new Uint8Array(2 * 1024 * 1024 + 1))))).toEqual({
      status: 400,
      error: "audio_too_large",
    });
    expect(await errorOf(await voice(recording("video/mp4")))).toEqual({ status: 400, error: "unsupported_audio" });
    setTranscriber(async () => ({ urdu: " ", english: "" }));
    expect(await errorOf(await voice(recording()))).toEqual({ status: 422, error: "no_speech" });
    setTranscriber(async () => {
      throw new Error("Gemini down");
    });
    expect(await errorOf(await voice(recording()))).toEqual({ status: 502, error: "voice_failed" });
  });
});

describe("a spoken Report", () => {
  it("keeps the Urdu original for Authorities and shows the public only the English", async () => {
    await citizen("bilal");
    const f = new FormData();
    f.set("lat", "33.7");
    f.set("lng", "73.05");
    f.set("description", ENGLISH);
    f.set("voiceTranscript", URDU);
    f.set("image", new File([new Uint8Array([1, 2, 3])], "p.jpg", { type: "image/jpeg" }));
    const res = await submitReport(new Request("http://test/api/reports", { method: "POST", body: f }));
    expect(res.status).toBe(200);
    const { issueId } = await res.json();
    const read = async () => (await (await getIssue(new Request("http://test/x"), ctx({ id: String(issueId) }))).json()).reports[0];

    signInAs("someone-else@gmail.com"); // an ordinary viewer of the real world
    const publicView = await read();
    expect(publicView.description).toBe(ENGLISH);
    expect(publicView.voice_transcript).toBeNull();

    signInAs("official@gov.pk");
    const official = await read();
    expect(official.description).toBe(ENGLISH);
    expect(official.voice_transcript).toBe(URDU);
  });
});
