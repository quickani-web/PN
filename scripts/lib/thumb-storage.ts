import type { SupabaseClient } from "@supabase/supabase-js";

export const THUMB_BUCKET = "thumbnails";

const MAX_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 20_000;

function extFromContentType(ct: string | null): string {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("avif")) return "avif";
  return "jpg";
}

const ALLOWED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

function safeObjectKey(videoId: string, ext: string): string {
  const id = videoId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `videos/${id}.${ext}`;
}

export function isStoredThumbUrl(url: string, supabaseUrl: string): boolean {
  if (!url) return false;
  return (
    url.includes("/storage/v1/object/public/thumbnails/") ||
    url.startsWith(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/thumbnails/`)
  );
}

export async function ensureThumbBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === THUMB_BUCKET);
  if (exists) {
    await supabase.storage.updateBucket(THUMB_BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ALLOWED_MIME,
    });
    return;
  }
  const { error } = await supabase.storage.createBucket(THUMB_BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED_MIME,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

export async function downloadAndStoreThumb(
  supabase: SupabaseClient,
  supabaseUrl: string,
  videoId: string,
  sourceUrl: string,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  if (!sourceUrl?.startsWith("https://")) {
    return { ok: false, error: "not https" };
  }
  if (isStoredThumbUrl(sourceUrl, supabaseUrl)) {
    return { ok: true, publicUrl: sourceUrl };
  }

  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    res = await fetch(sourceUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.pornhub.org/",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }

  if (!res.ok) return { ok: false, error: `http ${res.status}` };

  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!contentType.startsWith("image/")) {
    return { ok: false, error: `not image: ${contentType}` };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return { ok: false, error: "empty body" };
  if (buf.length > MAX_BYTES) return { ok: false, error: `too large ${buf.length}` };

  const ext = extFromContentType(contentType);
  const key = safeObjectKey(videoId, ext);

  const { error: upErr } = await supabase.storage
    .from(THUMB_BUCKET)
    .upload(key, buf, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (upErr) return { ok: false, error: upErr.message };

  const { data } = supabase.storage.from(THUMB_BUCKET).getPublicUrl(key);
  if (!data?.publicUrl) return { ok: false, error: "no public url" };
  return { ok: true, publicUrl: data.publicUrl };
}
