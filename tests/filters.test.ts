import { describe, expect, it } from "vitest";
import { parseListingSearchParams } from "@/lib/parse-search-params";

describe("filters and search params", () => {
  it("parses combined query params including shortest sort", () => {
    const parsed = parseListingSearchParams({
      q: "ocean",
      category: "science",
      duration: "10to20",
      sort: "shortest",
      page: "3",
    });
    expect(parsed).toEqual({
      q: "ocean",
      category: "science",
      duration: "10to20",
      sort: "shortest",
      page: 3,
    });
  });

  it("defaults page and sort safely", () => {
    const parsed = parseListingSearchParams({});
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("newest");
  });
});
