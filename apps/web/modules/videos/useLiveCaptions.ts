import { useDaily, useDailyEvent, useTranscription } from "@daily-co/daily-react";
import { useCallback, useEffect } from "react";

/**
 * Starts Daily.co transcription when `captionsEnabled` is true (on join and when toggled on
 * mid-call) and stops it on leave when the user had captions on. Pair with
 * `LiveCaptionOverlay` and the Cal Video CC toggle.
 */
export function useLiveCaptions(captionsEnabled: boolean): void {
  const daily = useDaily();
  const transcription = useTranscription();

  const tryStartTranscription = useCallback(() => {
    if (!captionsEnabled || !daily) return;
    if (transcription?.isTranscribing) return;
    daily.startTranscription({ language: "en", model: "nova-2", punctuate: true });
  }, [captionsEnabled, daily, transcription?.isTranscribing]);

  useEffect(() => {
    tryStartTranscription();
  }, [tryStartTranscription]);

  useDailyEvent(
    "joined-meeting",
    useCallback(() => {
      tryStartTranscription();
    }, [tryStartTranscription])
  );

  useDailyEvent(
    "left-meeting",
    useCallback(() => {
      if (!captionsEnabled || !daily) return;
      daily.stopTranscription();
    }, [captionsEnabled, daily])
  );

  useDailyEvent(
    "transcription-error",
    useCallback((ev) => {
      console.error("Live captions transcription error:", ev);
    }, [])
  );
}
