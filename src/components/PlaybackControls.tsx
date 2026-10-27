"use client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlaybackSpeed,
  playbackSpeeds,
  usePlaybackStore,
} from "@/store/usePlaybackStore";
import { PauseIcon, PlayIcon, StepForwardIcon } from "lucide-react";
import { useEffect } from "react";

const formatDuration = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const speedLabel = (speed: PlaybackSpeed, intervalMs: number) => {
  if (speed === "native") {
    const hz = 1000 / intervalMs;
    return `Native (${hz >= 1 ? `${hz.toFixed(hz < 10 ? 1 : 0)} rows/s` : `1 row / ${(intervalMs / 1000).toFixed(0)} s`})`;
  }
  return speed === "max" ? "Max" : `×${speed}`;
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Play / pause / step / speed for the current source. Keyboard: Space toggles
 * playback, → steps one row (ignored while typing in a form field).
 */
export const PlaybackControls = () => {
  const status = usePlaybackStore((s) => s.status);
  const speed = usePlaybackStore((s) => s.speed);
  const position = usePlaybackStore((s) => s.position);
  const total = usePlaybackStore((s) => s.total);
  const intervalMs = usePlaybackStore((s) => s.intervalMs);
  const error = usePlaybackStore((s) => s.error);
  const toggle = usePlaybackStore((s) => s.toggle);
  const step = usePlaybackStore((s) => s.step);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, step]);

  const playing = status === "playing";
  const disabled = status === "loading" || total === 0;

  return (
    <div className="flex flex-row items-center gap-2" aria-label="Playback">
      <Button
        size="icon"
        variant="outline"
        onClick={toggle}
        disabled={disabled}
        aria-label={playing ? "Pause" : "Play"}
        title={playing ? "Pause (Space)" : "Play (Space)"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={step}
        disabled={disabled}
        aria-label="Step one row"
        title="Step one row (→)"
      >
        <StepForwardIcon />
      </Button>
      <Select
        value={String(speed)}
        onValueChange={(value) =>
          setSpeed(value === "native" || value === "max" ? value : (Number(value) as PlaybackSpeed))
        }
      >
        <SelectTrigger className="w-[170px]" aria-label="Playback speed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {playbackSpeeds.map((option) => (
            <SelectItem key={String(option)} value={String(option)}>
              {speedLabel(option, intervalMs)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {status === "loading"
          ? "Loading…"
          : error
            ? `Error: ${error}`
            : `${position.toLocaleString("en")} / ${total.toLocaleString("en")} rows · ${formatDuration(position * intervalMs)}${status === "ended" ? " · end" : ""}`}
      </span>
    </div>
  );
};
