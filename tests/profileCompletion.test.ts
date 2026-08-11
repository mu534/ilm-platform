import { describe, expect, it } from "vitest";
import { getProfileCompletion } from "../app/lib/profileCompletion";

describe("profile completion", () => {
  it("calculates completion and names missing fields from profile state", () => {
    const result = getProfileCompletion({ country: "Ethiopia", learnerProfile: { preferredLanguage: "en", interests: [{ id: "i" }], goals: [] } });
    expect(result.percentage).toBe(38);
    expect(result.missing).toContain("Profile photo");
    expect(result.missing).toContain("Learning goals");
  });
});
