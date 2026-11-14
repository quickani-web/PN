import { describe, expect, it } from "vitest";
import {
  isSafeExternalRedirect,
  validateDestinationUrl,
  validateThumbnailUrl,
} from "@/lib/security/urls";

describe("URL security", () => {
  it("accepts valid https destinations", () => {
    const result = validateDestinationUrl("https://example.com/watch/1");
    expect(result.ok).toBe(true);
  });

  it("rejects javascript and data schemes", () => {
    expect(validateDestinationUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateDestinationUrl("data:text/html,hi").ok).toBe(false);
  });

  it("rejects localhost and private networks", () => {
    expect(validateDestinationUrl("https://localhost/x").ok).toBe(false);
    expect(validateDestinationUrl("https://127.0.0.1/x").ok).toBe(false);
    expect(validateDestinationUrl("https://192.168.1.10/x").ok).toBe(false);
    expect(validateDestinationUrl("https://10.0.0.5/x").ok).toBe(false);
  });

  it("rejects http destinations", () => {
    expect(validateDestinationUrl("http://example.com/watch").ok).toBe(false);
  });

  it("rejects credentialed urls", () => {
    expect(
      validateDestinationUrl("https://user:pass@example.com/watch").ok,
    ).toBe(false);
  });

  it("validates thumbnail urls", () => {
    expect(validateThumbnailUrl("https://picsum.photos/640/360").ok).toBe(true);
    expect(validateThumbnailUrl("https://example.com/page.html").ok).toBe(false);
  });

  it("guards redirects against open redirect abuse", () => {
    expect(isSafeExternalRedirect("https://example.com/ok")).toBe(true);
    expect(isSafeExternalRedirect("https://127.0.0.1/evil")).toBe(false);
  });
});
