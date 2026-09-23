"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ActionItem,
  MeetingDetail,
  askMeeting,
  fetchAudioUrl,
  fetchMeeting,
} from "../../lib/api";

type ChatMessage = { question: string; answer: string };

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setAskError(null);
    try {
      const { answer } = await askMeeting(id, q);
      setChatMessages((prev) => [...prev, { question: q, answer }]);
      setQuestion("");
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setAsking(false);
    }
  };

  const loadAudioUrl = useCallback(() => {
    fetchAudioUrl(id).then((res) => setAudioUrl(res.url)).catch(() => setAudioUrl(null));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = () => {
      fetchMeeting(id)
        .then((data) => {
          if (cancelled) return;
          setMeeting(data);
          if (data.status === "processing" || data.status === "uploading") {
            timer = setTimeout(poll, 3000);
          }
        })
        .catch((err) => !cancelled && setError(err.message));
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  useEffect(() => {
    if (meeting?.status === "ready") loadAudioUrl();
  }, [meeting?.status, loadAudioUrl]);

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  };

  const jumpToSegment = (segmentId: string | null) => {
    if (!segmentId) return;
    const el = segmentRefs.current[segmentId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const segment = meeting?.transcript_segments.find((s) => s.id === segmentId);
    if (segment) seekTo(segment.start_time);
  };

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  if (!meeting) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </main>
    );
  }

  const activeSegment = meeting.transcript_segments.find(
    (s) => currentTime >= s.start_time && currentTime < s.end_time
  );
  const summary = meeting.summaries[0];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Meetings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">
          {meeting.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {new Date(meeting.date).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>

        {meeting.status !== "ready" && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {meeting.status === "failed"
              ? "Processing failed for this meeting."
              : "Transcribing and summarizing this meeting — this page will update automatically."}
          </div>
        )}

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="mt-6 w-full"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onError={loadAudioUrl}
          />
        )}

        {meeting.status === "ready" && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="border-b border-zinc-200 px-4 py-3 font-medium text-black dark:border-zinc-800 dark:text-zinc-50">
                Transcript
              </h2>
              <div className="max-h-[32rem] overflow-y-auto p-4">
                {meeting.transcript_segments.map((segment) => (
                  <div
                    key={segment.id}
                    ref={(el) => {
                      segmentRefs.current[segment.id] = el;
                    }}
                    className={`mb-3 rounded-md p-2 ${
                      activeSegment?.id === segment.id
                        ? "bg-blue-100 dark:bg-blue-950"
                        : ""
                    }`}
                  >
                    <button
                      onClick={() => seekTo(segment.start_time)}
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {segment.speaker ?? "Unknown"} · {formatTimestamp(segment.start_time)}
                    </button>
                    <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-6">
              <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="border-b border-zinc-200 px-4 py-3 font-medium text-black dark:border-zinc-800 dark:text-zinc-50">
                  Summary
                </h2>
                <div className="markdown-body p-4 text-sm text-zinc-800 dark:text-zinc-200">
                  {summary ? (
                    <ReactMarkdown>{summary.content}</ReactMarkdown>
                  ) : (
                    <p className="text-zinc-500 dark:text-zinc-400">No summary yet.</p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="border-b border-zinc-200 px-4 py-3 font-medium text-black dark:border-zinc-800 dark:text-zinc-50">
                  Action items
                </h2>
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {meeting.action_items.map((item: ActionItem) => (
                    <li
                      key={item.id}
                      onClick={() => jumpToSegment(item.source_segment_id)}
                      className={`p-4 ${item.source_segment_id ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.owner === "Team"
                              ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {item.owner === "Team" ? "👥 Team" : `👤 ${item.owner ?? "Unassigned"}`}
                        </span>
                        {item.due_date && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            due {item.due_date}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{item.task}</p>
                    </li>
                  ))}
                  {meeting.action_items.length === 0 && (
                    <li className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                      No action items.
                    </li>
                  )}
                </ul>
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="border-b border-zinc-200 px-4 py-3 font-medium text-black dark:border-zinc-800 dark:text-zinc-50">
                  Ask the call
                </h2>
                <div className="max-h-80 overflow-y-auto p-4">
                  {chatMessages.length === 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Ask a question about this meeting.
                    </p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className="mb-4">
                      <p className="text-sm font-medium text-black dark:text-zinc-50">{m.question}</p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{m.answer}</p>
                    </div>
                  ))}
                  {asking && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Thinking…</p>
                  )}
                  {askError && <p className="text-sm text-red-500">{askError}</p>}
                </div>
                <form onSubmit={submitQuestion} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What did the team decide about..."
                    disabled={asking}
                    className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm text-black outline-none focus:border-blue-500 dark:border-zinc-700 dark:text-zinc-50"
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim()}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Ask
                  </button>
                </form>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
