import json
import os
import re

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "openai/gpt-oss-120b"

_client: Groq | None = None


def get_groq() -> Groq:
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY must be set")
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


TEMPLATE_INSTRUCTIONS = {
    "general": (
        "Write a concise meeting summary covering what was discussed, key decisions, "
        "and outcomes. Use short paragraphs or bullet points."
    ),
    "sales_call": (
        "Write a sales call summary. Cover: the prospect's needs/pain points, "
        "objections raised, what was demoed or discussed, and next steps in the deal."
    ),
    "standup": (
        "Write a standup summary. For each person, list what they completed, what "
        "they're working on next, and any blockers they raised."
    ),
}


def _format_transcript(transcript_segments: list[dict]) -> str:
    return "\n".join(
        f"{seg.get('speaker') or 'Unknown'}: {seg.get('text', '')}" for seg in transcript_segments
    )


def generate_summary(transcript_segments: list[dict], template_type: str = "general") -> str:
    transcript_text = _format_transcript(transcript_segments)
    instruction = TEMPLATE_INSTRUCTIONS.get(template_type, TEMPLATE_INSTRUCTIONS["general"])

    response = get_groq().chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": "You summarize meeting transcripts accurately and concisely. Only use information present in the transcript.",
            },
            {
                "role": "user",
                "content": f"{instruction}\n\nTranscript:\n{transcript_text}",
            },
        ],
    )
    return response.choices[0].message.content.strip()


def _extract_json_array(raw: str) -> list:
    """Parse a JSON array out of a model response that may be wrapped in markdown
    code fences or have surrounding prose."""
    text = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        bracket_match = re.search(r"\[.*\]", text, re.DOTALL)
        if not bracket_match:
            return []
        try:
            parsed = json.loads(bracket_match.group(0))
        except json.JSONDecodeError:
            return []

    if isinstance(parsed, dict):
        parsed = parsed.get("action_items", parsed.get("items", []))
    return parsed if isinstance(parsed, list) else []


def _best_matching_segment_id(owner: str, task: str, transcript_segments: list[dict]) -> str | None:
    """Best-effort match: pick the segment whose text shares the most words with
    the owner/task mention. Returns None if nothing overlaps."""
    needle_words = {w.lower() for w in re.findall(r"\w+", f"{owner} {task}") if len(w) > 3}
    if not needle_words:
        return None

    best_id, best_score = None, 0
    for seg in transcript_segments:
        seg_words = {w.lower() for w in re.findall(r"\w+", seg.get("text", ""))}
        score = len(needle_words & seg_words)
        if score > best_score:
            best_id, best_score = seg["id"], score

    return best_id if best_score > 0 else None


def extract_action_items(transcript_segments: list[dict]) -> list[dict]:
    transcript_text = _format_transcript(transcript_segments)

    response = get_groq().chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You extract action items from meeting transcripts. Respond with ONLY a JSON object "
                    'of the form {"action_items": [{"owner": string, "task": string, "due_date": string or null}]}. '
                    "due_date must be an ISO date (YYYY-MM-DD) if mentioned, otherwise null. "
                    "Include real, actionable commitments made in the transcript, including ones with no "
                    "single named owner. Each transcript line is prefixed with the speaker who said it "
                    "(e.g. \"Speaker 0: ...\"). Use this rule to set owner: "
                    "if someone commits in first person (\"I'll do X\", \"I will handle Y\"), owner is that "
                    "line's speaker label (e.g. \"Speaker 0\") -- NOT \"Team\". "
                    "If it's a collective or unassigned proposal with no one named (\"let's do X\", "
                    "\"we should do Y\"), owner is \"Team\". "
                    'If there are none, return {"action_items": []}.'
                ),
            },
            {"role": "user", "content": f"Transcript:\n{transcript_text}"},
        ],
    )

    raw_items = _extract_json_array(response.choices[0].message.content)

    action_items = []
    for item in raw_items:
        if not isinstance(item, dict) or not item.get("task"):
            continue
        owner = str(item.get("owner") or "").strip() or None
        task = str(item["task"]).strip()
        due_date = item.get("due_date") or None
        action_items.append(
            {
                "owner": owner,
                "task": task,
                "due_date": due_date,
                "source_segment_id": _best_matching_segment_id(owner or "", task, transcript_segments),
            }
        )
    return action_items
