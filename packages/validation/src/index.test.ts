import { describe, expect, it } from "vitest";
import { getVotingPhase, normalizeVotingCode, voteRequestSchema } from "./index";

describe("voting validation", () => {
  it("normalizes codes deterministically", () => {
    expect(normalizeVotingCode(" rey-7k9m 4p2x-q8tz ")).toBe("REY7K9M4P2XQ8TZ");
  });

  it("keeps voting closed without both valid dates", () => {
    expect(getVotingPhase(null, null)).toBe("closed");
    expect(getVotingPhase("invalid", "also-invalid")).toBe("closed");
  });

  it("rejects malformed vote payloads", () => {
    expect(voteRequestSchema.safeParse({ candidataId: "x", codigo: "1", turnstileToken: "" }).success).toBe(false);
  });
});
