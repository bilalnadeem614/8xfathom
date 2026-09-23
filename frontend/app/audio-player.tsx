"use client";

import { RefObject, useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  audioRef,
  src,
  currentTime,
  onTimeUpdate,
  onError,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  src: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onError: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoaded = () => setDuration(el.duration);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("loadedmetadata", onLoaded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [audioRef, src]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  };

  const seek = (time: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = time;
    onTimeUpdate(time);
  };

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={audioRef}
        src={src}
        className="hidden"
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onError={onError}
      />
      <button
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" strokeWidth={0} />
        )}
      </button>
      <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        {formatClock(currentTime)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(e) => seek(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-600 dark:bg-zinc-800"
      />
      <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        {formatClock(duration)}
      </span>
    </div>
  );
}
