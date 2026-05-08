import { describe, expect, it } from "vitest";
import { env } from "../lib/env";

describe("frontend env", () => {
  it("exposes an API base URL", () => {
    expect(env.NEXT_PUBLIC_API_BASE_URL).toContain("http");
  });
});
