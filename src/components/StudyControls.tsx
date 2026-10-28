"use client";
import { Button } from "@/components/ui/button";
import { startInteractionLogging, streamPosition } from "@/lib/study/interactionLogging";
import { isStudyMode } from "@/lib/study/studyMode";
import { useInteractionLogStore } from "@/store/useInteractionLogStore";
import { usePlaybackStore } from "@/store/usePlaybackStore";
import { FlagIcon, DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Logs that the participant noticed something now (button or F key). */
export function flagEvent(via: "button" | "key") {
  useInteractionLogStore.getState().log("flag", { via, ...streamPosition() });
}

export function downloadSession() {
  const { source, speed } = usePlaybackStore.getState();
  const json = useInteractionLogStore.getState().toJson({
    studyMode: isStudyMode(),
    source,
    speed,
    url: window.location.href,
  });
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${useInteractionLogStore.getState().sessionId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * User-study controls: "Flag event" (button or F) logs when the participant
 * spots something; "Export session" downloads the interaction log. The log is
 * recorded in every session but never leaves the device.
 */
export const StudyControls = () => {
  const eventCount = useInteractionLogStore((s) => s.events.length);
  const [study, setStudy] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setStudy(isStudyMode()));
    const stop = startInteractionLogging();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        flagEvent("key");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      stop();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-row items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => flagEvent("button")} title="Flag an event you noticed (F)">
        <FlagIcon /> Flag event
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={downloadSession}
        title={`Download this session's interaction log (${eventCount} events, stored only on this device)`}
      >
        <DownloadIcon /> Session
      </Button>
      {study && <span className="text-xs font-semibold text-amber-700">Study mode · analytics off</span>}
    </div>
  );
};
