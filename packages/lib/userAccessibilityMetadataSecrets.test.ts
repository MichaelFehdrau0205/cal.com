import { describe, expect, it } from "vitest";
import {
  mergeUserAccessibilitySecretMetadata,
  omitUserAccessibilitySecretsFromMetadata,
} from "./userAccessibilityMetadataSecrets";

describe("omitUserAccessibilitySecretsFromMetadata", () => {
  it("removes known secret keys and keeps other metadata", () => {
    const input = {
      deafHearingIdentity: "deaf" as const,
      inclusiveDeafCaptioningApiKey: "secret-caption",
      inclusiveDeafNoteTakingApiKey: "secret-notes",
      inclusiveBlindBrailleDisplayApiKey: "secret-braille",
      inclusiveAdhdWebsiteBlocker: "Freedom",
    };
    const out = omitUserAccessibilitySecretsFromMetadata(input);
    expect(out).toEqual({
      deafHearingIdentity: "deaf",
      inclusiveAdhdWebsiteBlocker: "Freedom",
    });
  });
});

describe("mergeUserAccessibilitySecretMetadata", () => {
  it("deletes secret keys when incoming value is an empty string", () => {
    const merged = {
      inclusiveDeafCaptioningApiKey: "old",
      inclusiveAdhdWebsiteBlocker: "Freedom",
    };
    mergeUserAccessibilitySecretMetadata(merged, { inclusiveDeafCaptioningApiKey: "" });
    expect(merged.inclusiveDeafCaptioningApiKey).toBeUndefined();
    expect(merged.inclusiveAdhdWebsiteBlocker).toBe("Freedom");
  });

  it("sets secret keys when incoming value is non-empty", () => {
    const merged = { inclusiveDeafCaptioningApiKey: "old" };
    mergeUserAccessibilitySecretMetadata(merged, { inclusiveDeafCaptioningApiKey: "new" });
    expect(merged.inclusiveDeafCaptioningApiKey).toBe("new");
  });
});
