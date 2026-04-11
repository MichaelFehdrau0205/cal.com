import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveCaptions } from "../useLiveCaptions";

const mockStartTranscription = vi.fn();
const mockStopTranscription = vi.fn();

const mockDaily = {
  startTranscription: mockStartTranscription,
  stopTranscription: mockStopTranscription,
};

const capturedHandlers: Record<string, (...args: unknown[]) => void> = {};

let mockIsTranscribing = false;

vi.mock("@daily-co/daily-react", () => ({
  useDaily: vi.fn(() => mockDaily),
  useDailyEvent: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    capturedHandlers[event] = handler;
  }),
  useTranscription: vi.fn(() => ({ isTranscribing: mockIsTranscribing })),
}));

describe("useLiveCaptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTranscribing = false;
    for (const key of Object.keys(capturedHandlers)) {
      delete capturedHandlers[key];
    }
  });

  describe("joined-meeting event", () => {
    it("starts transcription with correct params when captionsEnabled is true", () => {
      renderHook(() => useLiveCaptions(true));
      capturedHandlers["joined-meeting"]?.();

      expect(mockStartTranscription).toHaveBeenCalled();
      expect(mockStartTranscription).toHaveBeenCalledWith({
        language: "en",
        model: "nova-2",
        punctuate: true,
      });
    });

    it("does NOT start transcription when captionsEnabled is false", () => {
      renderHook(() => useLiveCaptions(false));
      mockStartTranscription.mockClear();
      capturedHandlers["joined-meeting"]?.();

      expect(mockStartTranscription).not.toHaveBeenCalled();
    });
  });

  describe("left-meeting event", () => {
    it("stops transcription when captionsEnabled is true", () => {
      renderHook(() => useLiveCaptions(true));
      mockStopTranscription.mockClear();
      capturedHandlers["left-meeting"]?.();

      expect(mockStopTranscription).toHaveBeenCalledTimes(1);
    });

    it("does NOT stop transcription when captionsEnabled is false", () => {
      renderHook(() => useLiveCaptions(false));
      mockStopTranscription.mockClear();
      capturedHandlers["left-meeting"]?.();

      expect(mockStopTranscription).not.toHaveBeenCalled();
    });
  });

  describe("transcription-error event", () => {
    it("handles error without throwing and does not crash the call", () => {
      renderHook(() => useLiveCaptions(true));

      expect(() => {
        capturedHandlers["transcription-error"]?.({ errorMsg: "test error" });
      }).not.toThrow();
    });

    it("does not call startTranscription or stopTranscription from the error handler", () => {
      renderHook(() => useLiveCaptions(true));
      mockStartTranscription.mockClear();
      mockStopTranscription.mockClear();
      capturedHandlers["transcription-error"]?.({ errorMsg: "test error" });

      expect(mockStartTranscription).not.toHaveBeenCalled();
      expect(mockStopTranscription).not.toHaveBeenCalled();
    });
  });

  describe("when daily call object is not available", () => {
    it("does not throw when daily is null on joined-meeting", async () => {
      const { useDaily } = await import("@daily-co/daily-react");
      (useDaily as ReturnType<typeof vi.fn>).mockReturnValue(null);

      renderHook(() => useLiveCaptions(true));

      expect(() => {
        capturedHandlers["joined-meeting"]?.();
      }).not.toThrow();
      (useDaily as ReturnType<typeof vi.fn>).mockReturnValue(mockDaily);
    });

    it("does not throw when daily is null on left-meeting", async () => {
      const { useDaily } = await import("@daily-co/daily-react");
      (useDaily as ReturnType<typeof vi.fn>).mockReturnValue(null);

      renderHook(() => useLiveCaptions(true));

      expect(() => {
        capturedHandlers["left-meeting"]?.();
      }).not.toThrow();
      (useDaily as ReturnType<typeof vi.fn>).mockReturnValue(mockDaily);
    });
  });

  describe("when transcription is already active", () => {
    it("does not call startTranscription from joined-meeting", () => {
      mockIsTranscribing = true;
      renderHook(() => useLiveCaptions(true));
      mockStartTranscription.mockClear();
      capturedHandlers["joined-meeting"]?.();

      expect(mockStartTranscription).not.toHaveBeenCalled();
    });
  });
});
