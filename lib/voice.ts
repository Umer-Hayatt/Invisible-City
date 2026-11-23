import { z } from "zod";

/**
 * Urdu voice adapter. Real: Gemini listens to the recording and returns what was said in Urdu script plus an
 * English translation. There is no fallback provider: without a Gemini key the mic button says voice is off.
 * Tests swap the whole thing with `setTranscriber`.
 */
export interface VoiceReading {
  urdu: string;
  english: string;
}

export const MAX_VOICE_BYTES = 2 * 1024 * 1024; // about two minutes of Opus speech
export const VOICE_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac", "audio/x-m4a"];
/** Browsers name the type with codecs, e.g. `audio/webm;codecs=opus`; only the part before `;` matters. */
export const baseType = (type: string) => type.split(";")[0].trim().toLowerCase();

const ReadingSchema = z.object({ urdu: z.string(), english: z.string() });

const PROMPT = `The recording is a resident of Islamabad, Pakistan describing a public problem (a pothole, rubbish, a broken light, a leak, a blocked drain and so on) for a civic reporting app. They usually speak Urdu and may mix in English words.
Return JSON with exactly two fields:
- "urdu": what they said, written in Urdu script. Keep English words they used as they said them.
- "english": a faithful, plain English translation that a city official can act on.
Do not add anything they did not say. If there is no speech, return empty strings for both.`;

type Transcriber = (audio: Buffer, mimeType: string) => Promise<VoiceReading>;
let override: Transcriber | null = null;
/** Tests only: replace Gemini with a scripted reading. Pass null to restore the real one. */
export function setTranscriber(fn: Transcriber | null) {
  override = fn;
}

export const voiceAvailable = () => Boolean(override || process.env.GEMINI_API_KEY);

export async function transcribeUrdu(audio: Buffer, mimeType: string): Promise<VoiceReading> {
  const out = override ? await override(audio, mimeType) : await withGemini(audio, mimeType);
  return { urdu: out.urdu.trim().slice(0, 1000), english: out.english.trim().slice(0, 1000) };
}

async function withGemini(audio: Buffer, mimeType: string): Promise<VoiceReading> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: audio.toString("base64") } }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { urdu: { type: "STRING" }, english: { type: "STRING" } },
          required: ["urdu", "english"],
        },
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return ReadingSchema.parse(JSON.parse(text));
}
