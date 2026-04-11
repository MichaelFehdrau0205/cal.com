"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import type { DailyCall } from "@daily-co/daily-js";
import { useDaily, useDailyEvent } from "@daily-co/daily-react";
import type { ReactElement } from "react";
import { useCallback, useRef, useState } from "react";

const MAX_FINAL_SEGMENTS = 12;

/**
 * Distinct speaker label colors on the dark caption panel. Order is assignment order (first
 * speaker in the session gets the first swatch). Omits a pure red vs green pair to reduce
 * confusion for common forms of color-vision deficiency.
 */
const SPEAKER_NAME_COLOR_CLASSES = [
  "text-sky-300",
  "text-amber-300",
  "text-violet-300",
  "text-cyan-300",
  "text-orange-300",
  "text-indigo-300",
  "text-fuchsia-300",
  "text-teal-300",
] as const;

const SPEAKER_COLOR_COUNT: number = SPEAKER_NAME_COLOR_CLASSES.length;

function colorIndexForParticipant(map: Map<string, number>, participantKey: string): number {
  const existing = map.get(participantKey);
  if (existing !== undefined) return existing;
  const idx = map.size % SPEAKER_COLOR_COUNT;
  map.set(participantKey, idx);
  return idx;
}

type ParsedTranscription = {
  participantKey: string;
  text: string;
  isFinal: boolean;
};

function parseTranscriptionMessage(ev: unknown): ParsedTranscription | null {
  if (!ev || typeof ev !== "object") return null;
  const root = ev as Record<string, unknown>;
  let inner: Record<string, unknown> = root;
  if (typeof root.transcription === "object" && root.transcription !== null) {
    inner = root.transcription as Record<string, unknown>;
  }
  const textRaw = (inner.text ?? inner.transcript) as string | undefined;
  const text = textRaw?.trim();
  if (!text) return null;
  const participantKey = String(inner.participantId ?? inner.user_id ?? inner.session_id ?? "unknown");
  const isFinal = Boolean(inner.is_final);
  return { participantKey, text, isFinal };
}

function displayNameForParticipant(daily: DailyCall | null, participantKey: string): string {
  if (!daily || participantKey === "unknown") return "Speaker";
  const participants = daily.participants();
  const p = participants?.[participantKey];
  const name = p?.user_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return "Speaker";
}

type FinalSegment = { key: string; speaker: string; text: string; colorIndex: number };

type InterimLine = { text: string; colorIndex: number };

/**
 * Renders closed captions for Cal Video from Daily `transcription-message` events when
 * `captionsEnabled` is true (same flag as `useLiveCaptions` and the CC toggle).
 */
export function LiveCaptionOverlay({ captionsEnabled }: { captionsEnabled: boolean }): ReactElement | null {
  const daily = useDaily();
  const { t } = useLocale();

  const [finalSegments, setFinalSegments] = useState<FinalSegment[]>([]);
  const [interimByParticipant, setInterimByParticipant] = useState<Record<string, InterimLine>>({});
  const speakerColorByKeyRef = useRef<Map<string, number>>(new Map());

  const clearCaptions = useCallback(() => {
    setFinalSegments([]);
    setInterimByParticipant({});
    speakerColorByKeyRef.current = new Map();
  }, []);

  useDailyEvent("joined-meeting", clearCaptions);
  useDailyEvent("left-meeting", clearCaptions);
  useDailyEvent("transcription-stopped", clearCaptions);

  useDailyEvent(
    "transcription-message",
    useCallback(
      (ev: unknown) => {
        if (!captionsEnabled) return;
        const parsed = parseTranscriptionMessage(ev);
        if (!parsed) return;

        if (parsed.isFinal) {
          setInterimByParticipant((prev) => {
            const next = { ...prev };
            delete next[parsed.participantKey];
            return next;
          });
          setFinalSegments((prev) => {
            const colorIndex = colorIndexForParticipant(speakerColorByKeyRef.current, parsed.participantKey);
            const speaker = displayNameForParticipant(daily, parsed.participantKey);
            const next = [
              ...prev,
              {
                key: `${Date.now()}-${parsed.participantKey}-${Math.random().toString(36).slice(2, 9)}`,
                speaker,
                text: parsed.text,
                colorIndex,
              },
            ];
            return next.slice(-MAX_FINAL_SEGMENTS);
          });
        } else {
          const colorIndex = colorIndexForParticipant(speakerColorByKeyRef.current, parsed.participantKey);
          setInterimByParticipant((prev) => ({
            ...prev,
            [parsed.participantKey]: { text: parsed.text, colorIndex },
          }));
        }
      },
      [captionsEnabled, daily]
    )
  );

  if (!captionsEnabled) return null;

  const interimEntries = Object.entries(interimByParticipant);
  if (finalSegments.length === 0 && interimEntries.length === 0) return null;

  return (
    <div
      aria-label={t("live_captions_region_label")}
      className="pointer-events-none fixed bottom-24 left-1/2 z-[100] max-h-44 w-[min(92vw,40rem)] -translate-x-1/2 rounded-md border border-white/10 bg-black/70 px-3 py-2 text-left shadow-lg backdrop-blur-sm sm:bottom-28"
      role="log"
      aria-live="polite"
      aria-relevant="additions text">
      <div className="max-h-40 space-y-1 overflow-y-auto text-sm text-white leading-snug">
        {finalSegments.map((seg) => (
          <p key={seg.key} className="break-words [text-shadow:0_0_8px_rgba(0,0,0,0.9)]">
            <span
              className={classNames(
                "font-semibold",
                SPEAKER_NAME_COLOR_CLASSES[seg.colorIndex % SPEAKER_COLOR_COUNT]
              )}>
              {seg.speaker}:
            </span>{" "}
            {seg.text}
          </p>
        ))}
        {interimEntries.map(([participantKey, { text, colorIndex }]) => (
          <p
            key={`interim-${participantKey}`}
            className="break-words text-white/90 italic [text-shadow:0_0_8px_rgba(0,0,0,0.9)]">
            <span
              className={classNames(
                "font-semibold not-italic",
                SPEAKER_NAME_COLOR_CLASSES[colorIndex % SPEAKER_COLOR_COUNT]
              )}>
              {displayNameForParticipant(daily, participantKey)}:
            </span>{" "}
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
