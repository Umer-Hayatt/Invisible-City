"use client";

import { t } from "./i18n";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = url;
  });
}

/**
 * Downscales the photo to max 1280px JPEG (keeps uploads small for the AI) and
 * computes a 64-bit difference hash (dHash) used for duplicate-photo detection.
 */
export async function prepareImage(file: File): Promise<{ file: File; hash: string; preview: string }> {
  const img = await loadImage(file);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Compression failed"))), "image/jpeg", 0.85),
  );

  const h = document.createElement("canvas");
  h.width = 9;
  h.height = 8;
  const hctx = h.getContext("2d", { willReadFrequently: true })!;
  hctx.drawImage(img, 0, 0, 9, 8);
  const px = hctx.getImageData(0, 0, 9, 8).data;
  const gray = (x: number, y: number) => {
    const i = (y * 9 + x) * 4;
    return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
  };
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += gray(x, y) > gray(x + 1, y) ? "1" : "0";
  let hash = "";
  for (let i = 0; i < 64; i += 4) hash += parseInt(bits.slice(i, i + 4), 2).toString(16);

  URL.revokeObjectURL(img.src);
  const out = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  return { file: out, hash, preview: URL.createObjectURL(blob) };
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("time.justNow");
  if (s < 3600) return t("time.minutes", { n: Math.floor(s / 60) });
  if (s < 86400) return t("time.hours", { n: Math.floor(s / 3600) });
  const d = Math.floor(s / 86400);
  return d === 1 ? t("time.yesterday") : t("time.days", { n: d });
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}
