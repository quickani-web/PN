const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isPrivateIpv4(host)) return true;
  if (host.includes(":")) return true;
  return false;
}

export type UrlValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function validateHttpsUrl(input: string): UrlValidationResult {
  if (!input || typeof input !== "string") {
    return { ok: false, error: "URL is required" };
  }
  const trimmed = input.trim();
  if (trimmed.length > 2048) return { ok: false, error: "URL is too long" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  const scheme = parsed.protocol.toLowerCase();
  if (
    scheme === "javascript:" ||
    scheme === "data:" ||
    scheme === "file:" ||
    scheme === "blob:"
  ) {
    return { ok: false, error: "Unsafe URL scheme" };
  }
  if (scheme !== "https:") {
    return { ok: false, error: "Only HTTPS URLs are allowed" };
  }
  if (!parsed.hostname || isBlockedHost(parsed.hostname)) {
    return { ok: false, error: "URL host is not allowed" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with credentials are not allowed" };
  }

  return { ok: true, normalized: parsed.toString() };
}

export function validateDestinationUrl(input: string): UrlValidationResult {
  return validateHttpsUrl(input);
}

export function validateThumbnailUrl(input: string): UrlValidationResult {
  const result = validateHttpsUrl(input);
  if (!result.ok) return result;
  try {
    const pathname = new URL(result.normalized).pathname.toLowerCase();
    if (/\.(html?|php|exe|js|css|xml|json)(\?.*)?$/i.test(pathname)) {
      return { ok: false, error: "Thumbnail URL does not look like an image" };
    }
  } catch {
    return { ok: false, error: "Invalid thumbnail URL" };
  }
  return result;
}

export function isSafeExternalRedirect(storedUrl: string): boolean {
  return validateDestinationUrl(storedUrl).ok;
}
