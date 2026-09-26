export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type MeetingStatus = "uploading" | "processing" | "ready" | "failed";

export type Meeting = {
  id: string;
  title: string;
  date: string;
  duration_seconds: number | null;
  participants: string[];
  status: MeetingStatus;
  audio_url: string | null;
  created_at: string;
};

export type TranscriptSegment = {
  id: string;
  meeting_id: string;
  speaker: string | null;
  start_time: number;
  end_time: number;
  text: string;
};

export type Summary = {
  id: string;
  meeting_id: string;
  template_type: string;
  content: string;
  generated_at: string;
};

export type ActionItem = {
  id: string;
  meeting_id: string;
  owner: string | null;
  task: string;
  due_date: string | null;
  source_segment_id: string | null;
};

export type MeetingDetail = Meeting & {
  transcript_segments: TranscriptSegment[];
  summaries: Summary[];
  action_items: ActionItem[];
};

export type InboxActionItem = ActionItem & {
  meeting: { id: string; title: string; date: string };
};

export async function fetchActionItems(): Promise<InboxActionItem[]> {
  const res = await fetch(`${API_URL}/action-items`);
  if (!res.ok) throw new Error(`Failed to fetch action items: ${res.status}`);
  return res.json();
}

export async function fetchMeeting(id: string): Promise<MeetingDetail> {
  const res = await fetch(`${API_URL}/meetings/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch meeting: ${res.status}`);
  return res.json();
}

export async function fetchAudioUrl(id: string): Promise<{ url: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/meetings/${id}/audio-url`);
  if (!res.ok) throw new Error(`Failed to fetch audio url: ${res.status}`);
  return res.json();
}

export async function uploadMeeting(file: File, title: string): Promise<Meeting> {
  const form = new FormData();
  form.append("file", file);
  if (title.trim()) form.append("title", title.trim());
  const res = await fetch(`${API_URL}/meetings/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function renameMeeting(id: string, title: string): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Rename failed: ${res.status}`);
  }
  return res.json();
}

export async function askMeeting(id: string, question: string): Promise<{ answer: string }> {
  const res = await fetch(`${API_URL}/meetings/${id}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to ask: ${res.status}`);
  }
  return res.json();
}
