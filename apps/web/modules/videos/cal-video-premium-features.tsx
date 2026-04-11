import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import type { DailyCall } from "@daily-co/daily-js";
import { useDaily, useDailyEvent, useRecording, useTranscription } from "@daily-co/daily-react";
import React, { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BUTTONS } from "./button-states";
import { LiveCaptionOverlay } from "./live-caption-overlay";
import { useLiveCaptions } from "./useLiveCaptions";

export type DailyCustomTrayButtonVisualState = "default" | "sidebar-open" | "active";

export interface DailyCustomTrayButton {
  iconPath: string;
  iconPathDarkMode?: string;
  label: string;
  tooltip: string;
  visualState?: DailyCustomTrayButtonVisualState;
}

type RecordingState = {
  isRecording: boolean;
};

type TranscriptionState = {
  isTranscribing: boolean;
};

type CalVideoCallbacksParams = {
  daily: DailyCall | null;
  recording: RecordingState | null;
  transcription: TranscriptionState | null;
  showRecordingButton: boolean;
  showTranscriptionButton: boolean;
  enableAutomaticTranscription: boolean;
  enableAutomaticRecordingForOrganizer: boolean;
};

export const createCalVideoCallbacks = (params: CalVideoCallbacksParams) => {
  const {
    daily,
    recording,
    transcription,
    showRecordingButton,
    showTranscriptionButton,
    enableAutomaticTranscription,
    enableAutomaticRecordingForOrganizer,
  } = params;

  const startRecording = () => {
    daily?.startRecording({
      // 480p
      videoBitrate: 2000,
    });
  };

  const updateCustomTrayButtons = ({
    recording: overrideRecording,
    transcription: overrideTranscription,
  }: {
    recording?: DailyCustomTrayButton;
    transcription?: DailyCustomTrayButton;
  }) => {
    const currentRecordingState = recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING;
    const currentTranscriptionState = transcription?.isTranscribing
      ? BUTTONS.STOP_TRANSCRIPTION
      : BUTTONS.START_TRANSCRIPTION;

    daily?.updateCustomTrayButtons({
      ...(showRecordingButton
        ? {
            recording: overrideRecording ?? currentRecordingState,
          }
        : {}),
      ...(showTranscriptionButton
        ? {
            transcription: overrideTranscription ?? currentTranscriptionState,
          }
        : {}),
    });
  };

  const onMeetingJoined = () => {
    if (enableAutomaticTranscription && !transcription?.isTranscribing) {
      daily?.startTranscription();
    }
    if (enableAutomaticRecordingForOrganizer && !recording?.isRecording) {
      startRecording();
    }
  };

  const onRecordingStarted = () => {
    updateCustomTrayButtons({
      recording: BUTTONS.STOP_RECORDING,
    });
  };

  const onRecordingStopped = () => {
    updateCustomTrayButtons({
      recording: BUTTONS.START_RECORDING,
    });
  };

  const onTranscriptionStarted = () => {
    updateCustomTrayButtons({
      transcription: BUTTONS.STOP_TRANSCRIPTION,
    });
  };

  const onTranscriptionStopped = () => {
    updateCustomTrayButtons({
      transcription: BUTTONS.START_TRANSCRIPTION,
    });
  };

  const toggleRecording = async () => {
    if (recording?.isRecording) {
      updateCustomTrayButtons({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_STOP,
      });
      daily?.stopRecording();
    } else {
      updateCustomTrayButtons({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_START,
      });
      startRecording();
    }
  };

  const toggleTranscription = async () => {
    if (transcription?.isTranscribing) {
      updateCustomTrayButtons({
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_STOP,
      });
      daily?.stopTranscription();
    } else {
      updateCustomTrayButtons({
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_START,
      });
      daily?.startTranscription();
    }
  };

  const onCustomButtonClick = async (ev: { button_id: string }) => {
    if (ev?.button_id === "recording") {
      toggleRecording();
    } else if (ev?.button_id === "transcription") {
      toggleTranscription();
    }
  };

  return {
    onMeetingJoined,
    onRecordingStarted,
    onRecordingStopped,
    onTranscriptionStarted,
    onTranscriptionStopped,
    onCustomButtonClick,
    toggleRecording,
    toggleTranscription,
    updateCustomTrayButtons,
    startRecording,
  };
};

export const CalVideoPremiumFeatures = ({
  showRecordingButton,
  enableAutomaticTranscription,
  enableAutomaticRecordingForOrganizer,
  showTranscriptionButton,
}: {
  showRecordingButton: boolean;
  enableAutomaticTranscription: boolean;
  enableAutomaticRecordingForOrganizer: boolean;
  showTranscriptionButton: boolean;
}) => {
  const { t } = useLocale();
  const daily = useDaily();
  const utils = trpc.useUtils();
  const { data: me, isSuccess: meQuerySuccess } = trpc.viewer.me.get.useQuery();
  const updateProfile = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
    },
  });

  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const appliedServerCaptionPref = useRef(false);

  useEffect(() => {
    if (!meQuerySuccess || !me || appliedServerCaptionPref.current) return;
    appliedServerCaptionPref.current = true;
    setCaptionsEnabled(me.liveCaptionsEnabled ?? false);
  }, [me, meQuerySuccess]);

  const canUseCaptionToggle = meQuerySuccess && !!me;

  const toggleClosedCaptions = useCallback(() => {
    if (!canUseCaptionToggle) return;
    const next = !captionsEnabled;
    setCaptionsEnabled(next);
    updateProfile.mutate(
      { liveCaptionsEnabled: next },
      {
        onError: () => {
          setCaptionsEnabled(!next);
        },
      }
    );
  }, [canUseCaptionToggle, captionsEnabled, updateProfile]);

  const [transcript, setTranscript] = useState("");
  const [transcriptHeight, setTranscriptHeight] = useState(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const transcription = useTranscription();
  const recording = useRecording();

  useLiveCaptions(captionsEnabled);

  const callbacks = createCalVideoCallbacks({
    daily,
    recording,
    transcription,
    showRecordingButton,
    showTranscriptionButton,
    enableAutomaticTranscription,
    enableAutomaticRecordingForOrganizer,
  });

  useDailyEvent(
    "app-message",
    useCallback((ev) => {
      const data = ev?.data;
      if (data.user_name && data.text) setTranscript(`${data.user_name}: ${data.text}`);
    }, [])
  );

  useDailyEvent("joined-meeting", callbacks.onMeetingJoined);
  useDailyEvent("transcription-started", callbacks.onTranscriptionStarted);
  useDailyEvent("recording-started", callbacks.onRecordingStarted);
  useDailyEvent("transcription-stopped", callbacks.onTranscriptionStopped);
  useDailyEvent("recording-stopped", callbacks.onRecordingStopped);
  useDailyEvent("custom-button-click", callbacks.onCustomButtonClick);

  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTranscriptHeight(entry.target.scrollHeight);
      }
    });

    if (transcriptRef.current) {
      observer.observe(transcriptRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current?.scrollHeight,
      behavior: "smooth",
    });
  }, [transcriptHeight]);

  return (
    <>
      {canUseCaptionToggle ? (
        <button
          type="button"
          aria-pressed={captionsEnabled}
          aria-label={captionsEnabled ? t("cal_video_cc_turn_off") : t("cal_video_cc_turn_on")}
          className={classNames(
            "fixed bottom-28 left-4 z-[101] min-h-10 min-w-10 rounded-md border px-3 py-2 text-sm font-semibold shadow-lg transition-colors",
            captionsEnabled
              ? "border-emerald-400/80 bg-emerald-600/90 text-white"
              : "border-white/20 bg-black/75 text-white hover:bg-black/90"
          )}
          disabled={updateProfile.isPending}
          onClick={toggleClosedCaptions}>
          {t("cal_video_cc_short_label")}
        </button>
      ) : null}
      <LiveCaptionOverlay captionsEnabled={captionsEnabled} />
      {transcript ? (
        <div
          id="cal-ai-transcription"
          style={{
            textShadow: "0 0 20px black, 0 0 20px black, 0 0 20px black",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
          ref={transcriptRef}
          className="flex max-h-full justify-center overflow-x-hidden overflow-y-scroll p-2 text-center text-white">
          {transcript
            ? transcript.split("\n").map((line, i) => (
                <Fragment key={`transcript-${i}`}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))
            : ""}
        </div>
      ) : null}
    </>
  );
};
