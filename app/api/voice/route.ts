import { requireRole } from "@/lib/roles";
import { baseType, MAX_VOICE_BYTES, transcribeUrdu, voiceAvailable, VOICE_TYPES } from "@/lib/voice";

export const maxDuration = 30;

/**
 * Turns a Citizen's spoken Urdu into Urdu text plus an English translation, for the Report form to show
 * before anything is sent. Nothing is stored here; the Report carries the text when it is submitted.
 */
export async function POST(req: Request) {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  if (actor.suspended) return Response.json({ error: "suspended" }, { status: 403 });
  if (!actor.profileComplete) return Response.json({ error: "profile_incomplete" }, { status: 403 });
  if (!voiceAvailable()) return Response.json({ error: "voice_unavailable" }, { status: 503 });

  let audio: FormDataEntryValue | null;
  try {
    audio = (await req.formData()).get("audio");
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!(audio instanceof File) || audio.size === 0) return Response.json({ error: "no_speech" }, { status: 400 });
  if (audio.size > MAX_VOICE_BYTES) return Response.json({ error: "audio_too_large" }, { status: 400 });
  const type = baseType(audio.type);
  if (!VOICE_TYPES.includes(type)) return Response.json({ error: "unsupported_audio" }, { status: 400 });

  let reading;
  try {
    reading = await transcribeUrdu(Buffer.from(await audio.arrayBuffer()), type);
  } catch (err) {
    console.error("[voice] transcription failed", err);
    return Response.json({ error: "voice_failed" }, { status: 502 });
  }
  if (!reading.urdu && !reading.english) return Response.json({ error: "no_speech" }, { status: 422 });
  return Response.json(reading);
}
