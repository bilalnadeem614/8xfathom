"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Calendar,
  Send,
  User,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  ActionItem,
  MeetingDetail,
  askMeeting,
  fetchAudioUrl,
  fetchMeeting,
} from "../../lib/api";
import { AudioPlayer } from "../../audio-player";

type ChatMessage = { question: string; answer: string };

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-zinc-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      {children}
    </h2>
  );
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
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </main>
    );
  }

  if (!meeting) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </main>
    );
  }

  const activeSegment = meeting.transcript_segments.find(
    (s) => currentTime >= s.start_time && currentTime < s.end_time
  );
  const summary = meeting.summaries[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
        Meetings
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {meeting.title}
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
        <Calendar className="h-3 w-3" strokeWidth={2} />
        {new Date(meeting.date).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>

      {meeting.status !== "ready" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {meeting.status === "failed" ? (
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} />
          )}
          {meeting.status === "failed"
            ? "Processing failed for this meeting."
            : "Transcribing and summarizing this meeting — this page will update automatically."}
        </div>
      )}

      {audioUrl && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <AudioPlayer
            audioRef={audioRef}
            src={audioUrl}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onError={loadAudioUrl}
          />
        </div>
      )}

      {meeting.status === "ready" && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="flex h-[34rem] flex-col overflow-hidden rounded-xl border border-zinc-300 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h2 className="shrink-0 border-b border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                Transcript
              </h2>
              <div className="flex-1 overflow-y-auto p-3">
                {meeting.transcript_segments.map((segment) => (
                  <div
                    key={segment.id}
                    ref={(el) => {
                      segmentRefs.current[segment.id] = el;
                    }}
                    className={`mb-1 border-l-2 py-1 pl-3 pr-2 transition-colors ${
                      activeSegment?.id === segment.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                        : "border-transparent"
                    }`}
                  >
                    <button
                      onClick={() => seekTo(segment.start_time)}
                      className="font-mono text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {formatTimestamp(segment.start_time)}
                    </button>
                    <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {segment.speaker ?? "Unknown"}
                    </span>
                    <p className="mt-0.5 text-sm leading-snug text-zinc-800 dark:text-zinc-200">
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex h-[34rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <SectionHeader>Summary</SectionHeader>
              <div className="markdown-body flex-1 overflow-y-auto p-4 text-sm text-zinc-800 dark:text-zinc-200">
                {summary ? (
                  <ReactMarkdown>{summary.content}</ReactMarkdown>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No summary yet.</p>
                )}
              </div>
            </section>

            <section className="flex h-[34rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <SectionHeader>Action items</SectionHeader>
              <ul className="flex-1 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
                {meeting.action_items.map((item: ActionItem) => (
                  <li
                    key={item.id}
                    onClick={() => jumpToSegment(item.source_segment_id)}
                    className={`px-4 py-3 ${item.source_segment_id ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {item.owner === "Team" ? (
                          <Users className="h-3 w-3" strokeWidth={2} />
                        ) : (
                          <User className="h-3 w-3" strokeWidth={2} />
                        )}
                        {item.owner === "Team" ? "Team" : item.owner ?? "Unassigned"}
                      </span>
                      {item.due_date && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-600">
                          due {item.due_date}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{item.task}</p>
                  </li>
                ))}
                {meeting.action_items.length === 0 && (
                  <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                    No action items.
                  </li>
                )}
              </ul>
            </section>
          </div>

          <section className="mx-auto mt-6 flex h-[30rem] max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <SectionHeader>Ask the call</SectionHeader>
            <div className="flex-1 overflow-y-auto p-4">
              {chatMessages.length === 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Ask a question about this meeting.
                </p>
              )}
              <div className="flex flex-col gap-3">
                {chatMessages.map((m, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2 text-sm text-white">
                      {m.question}
                    </p>
                    <p className="mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3.5 py-2 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      {m.answer}
                    </p>
                  </div>
                ))}
              </div>
              {asking && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  Thinking…
                </p>
              )}
              {askError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{askError}</p>}
            </div>
            <form
              onSubmit={submitQuestion}
              className="flex shrink-0 items-center gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What did the team decide about..."
                disabled={asking}
                className="flex-1 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                aria-label="Ask"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
