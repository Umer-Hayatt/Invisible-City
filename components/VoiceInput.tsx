"use client";

import { LoaderCircle, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

export interface VoiceText {
  urdu: string;
  english: string;
}

const MAX_SECONDS = 60;
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

/**
 * The mic button on the Report form: tap to start speaking (in Urdu), tap again to stop. The recording goes to
 * `/api/voice`, which returns Urdu text and an English translation for the Citizen to check before sending.
 */
export default function VoiceInput({ onText, disabled }: { onText: (v: VoiceText) => void; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (timer.current) clearInterval(timer.current);
    if (limit.current) clearTimeout(limit.current);
  }

  useEffect(
    () => () => {
      clearTimers();
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function start() {
    setError("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return setError(t("voice.unsupported"));
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError(t("voice.noMic"));
    }
    const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      clearTimers();
      send(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    limit.current = setTimeout(stop, MAX_SECONDS * 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function send(blob: Blob) {
    setState("working");
    const fd = new FormData();
    fd.append("audio", new File([blob], "voice", { type: blob.type }));
    try {
      onText(await api<VoiceText>("/api/voice", { method: "POST", body: fd }));
    } catch (e) {
      setError(errorText((e as Error).message));
    } finally {
      setState("idle");
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || state === "working"}
        onClick={state === "recording" ? stop : start}
        aria-pressed={state === "recording"}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          state === "recording" ? "bg-red-600 text-white" : "border border-line bg-surface text-ink hover:border-brand hover:text-brand"
        }`}
      >
        {state === "recording" ? (
          <>
            <Square size={14} className="animate-pulse" fill="currentColor" /> {t("voice.stop", { s: seconds })}
          </>
        ) : state === "working" ? (
          <>
            <LoaderCircle size={15} className="animate-spin" /> {t("voice.working")}
          </>
        ) : (
          <>
            <Mic size={15} /> {t("voice.start")}
          </>
        )}
      </button>
      {error && <div className="mt-2 text-xs font-medium text-red-600">{error}</div>}
    </div>
  );
}
