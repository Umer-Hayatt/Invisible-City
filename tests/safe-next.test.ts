import { describe, expect, it } from "vitest";
import { safeNext } from "../lib/safe-next";

describe("where to go after signing in", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/report?x=1#a")).toBe("/report?x=1#a");
    expect(safeNext(null)).toBe("/");
  });

  it("refuses other origins, including backslash and scheme tricks", () => {
    const bad = ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "javascript:alert(1)", "evil.com"];
    for (const raw of bad) expect(safeNext(raw), raw).toBe("/");
  });
});
