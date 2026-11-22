import crypto from "node:crypto";

/** Photo store adapter: takes image bytes, returns a public URL. Real: Cloudinary. Fake: a fixed URL. */
export interface PhotoStore {
  upload(bytes: Buffer, opts?: { mediaType?: string; publicId?: string }): Promise<string>;
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function checkImage(file: { type: string; size: number }) {
  if (!TYPES.includes(file.type)) throw new Error("Only JPEG, PNG, WebP or GIF images are supported");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image is larger than 8 MB");
}

export const FAKE_PHOTO_URL = "https://photos.test/fixed.jpg";

export function fakePhotoStore(url = FAKE_PHOTO_URL): PhotoStore & { uploads: number } {
  const store = {
    uploads: 0,
    async upload() {
      store.uploads++;
      return url;
    },
  };
  return store;
}

/** Signed upload to Cloudinary's REST API (no SDK needed). */
export function cloudinaryStore(cfg: { cloudName: string; apiKey: string; apiSecret: string }): PhotoStore {
  return {
    async upload(bytes, opts = {}) {
      const params: Record<string, string> = {
        folder: "invisible-city",
        timestamp: String(Math.floor(Date.now() / 1000)),
      };
      if (opts.publicId) {
        params.public_id = opts.publicId;
        params.overwrite = "true";
      }
      const toSign = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&");
      const signature = crypto.createHash("sha1").update(toSign + cfg.apiSecret).digest("hex");
      const form = new FormData();
      for (const [k, v] of Object.entries(params)) form.set(k, v);
      form.set("api_key", cfg.apiKey);
      form.set("signature", signature);
      form.set("file", new Blob([new Uint8Array(bytes)], { type: opts.mediaType ?? "image/jpeg" }));
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
      if (!res.ok || !body.secure_url) throw new Error(`Photo upload failed: ${body.error?.message ?? res.status}`);
      return body.secure_url;
    },
  };
}

const g = globalThis as unknown as { __icPhotos?: PhotoStore };

export function photoStore(): PhotoStore {
  if (g.__icPhotos) return g.__icPhotos;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured (see docs/SETUP.md)");
  return (g.__icPhotos = cloudinaryStore({ cloudName, apiKey, apiSecret }));
}

/** Tests: use this store instead of Cloudinary. */
export function setPhotoStore(s: PhotoStore | null) {
  g.__icPhotos = s ?? undefined;
}
