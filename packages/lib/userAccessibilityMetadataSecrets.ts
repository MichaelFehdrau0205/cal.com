/** User.metadata keys that must never be returned to the client (API keys). */
export const USER_ACCESSIBILITY_SECRET_METADATA_KEYS = [
  "inclusiveDeafCaptioningApiKey",
  "inclusiveDeafNoteTakingApiKey",
  "inclusiveBlindBrailleDisplayApiKey",
] as const;

export type UserAccessibilitySecretMetadataKey = (typeof USER_ACCESSIBILITY_SECRET_METADATA_KEYS)[number];

export function omitUserAccessibilitySecretsFromMetadata<T extends Record<string, unknown>>(
  metadata: T | null | undefined
): T | null | undefined {
  if (!metadata || typeof metadata !== "object") {
    return metadata;
  }
  const next = { ...metadata };
  for (const key of USER_ACCESSIBILITY_SECRET_METADATA_KEYS) {
    delete next[key];
  }
  return next as T;
}

/** Apply secret updates: empty string from the client removes the stored key. */
export function mergeUserAccessibilitySecretMetadata(
  merged: Record<string, unknown>,
  incoming: Record<string, unknown>
): void {
  for (const key of USER_ACCESSIBILITY_SECRET_METADATA_KEYS) {
    if (!Object.hasOwn(incoming, key)) continue;
    const value = incoming[key];
    if (typeof value === "string" && value.length === 0) {
      delete merged[key];
    } else if (typeof value === "string") {
      merged[key] = value;
    }
  }
}
