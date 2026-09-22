#!/usr/bin/env python3
"""Appends PROMPT/RESPONSE entries to .agent-logs/ for every turn.
Wired via .claude/settings.json UserPromptSubmit + Stop hooks.
"""
import json, os, sys, datetime, re

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG_DIR = os.path.join(REPO, ".agent-logs")
STATE_DIR = os.path.join(REPO, ".claude", "hooks", "state")
AUTHOR = "bilalnadeem614"
PROJECT = os.path.basename(REPO)
DEFAULT_MODEL = "claude-sonnet-5"


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def state_path(session_id):
    return os.path.join(STATE_DIR, f"{session_id}.json")


def load_state(session_id):
    p = state_path(session_id)
    if os.path.exists(p):
        with open(p) as f:
            return json.load(f)
    return None


def save_state(session_id, state):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(state_path(session_id), "w") as f:
        json.dump(state, f)


def new_state(session_id):
    ts = datetime.datetime.now(datetime.timezone.utc)
    fname = f"{ts.strftime('%Y-%m-%d_%H-%M-%S')}_{session_id}.md"
    log_path = os.path.join(LOG_DIR, fname)
    state = {
        "log_file": log_path,
        "exchange_num": 0,
        "date": ts.strftime("%Y-%m-%d"),
        "first_prompt_time": now_iso(),
        "model": DEFAULT_MODEL,
    }
    os.makedirs(LOG_DIR, exist_ok=True)
    header = f"""---
session_id: {session_id}
date: {state['date']}
author: {AUTHOR}
model: {state['model']}
tool: claude-code
project: {PROJECT}
total_exchanges: 0
first_prompt_time: {state['first_prompt_time']}
last_prompt_time: {state['first_prompt_time']}
---

# Session Log - {state['date']}

Session: `{session_id}` | Project: `{PROJECT}` | Author: `{AUTHOR}`

---
"""
    with open(log_path, "w") as f:
        f.write(header)
    return state


def update_header(state, session_id):
    with open(state["log_file"]) as f:
        content = f.read()
    content = re.sub(r"total_exchanges: \d+", f"total_exchanges: {state['exchange_num']}", content, count=1)
    content = re.sub(r"last_prompt_time: .*", f"last_prompt_time: {now_iso()}", content, count=1)
    content = re.sub(r"^model: .*$", f"model: {state['model']}", content, count=1, flags=re.MULTILINE)
    with open(state["log_file"], "w") as f:
        f.write(content)


def append_entry(state, entry_type, num, text, model):
    block = f"""
[LOG_ENTRY type={entry_type} num={num} session={state['session_id']}]
timestamp: {now_iso()}
model: {model}

{text}

"""
    with open(state["log_file"], "a") as f:
        f.write(block)


def extract_final_response(transcript_path):
    """Read the transcript jsonl, return (text, model) of the last assistant text message."""
    text_parts = []
    model = DEFAULT_MODEL
    try:
        with open(transcript_path) as f:
            lines = f.readlines()
    except (OSError, FileNotFoundError):
        return "", model

    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("type") != "assistant":
            continue
        msg = entry.get("message", {})
        if msg.get("model"):
            model = msg["model"]
        content = msg.get("content", [])
        parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
        if parts:
            text_parts = parts
            break

    return "\n".join(text_parts).strip(), model


def main():
    data = json.load(sys.stdin)
    session_id = data.get("session_id", "unknown")
    event = data.get("hook_event_name", "")

    state = load_state(session_id)
    if state is None:
        state = new_state(session_id)
    state["session_id"] = session_id

    if event == "UserPromptSubmit":
        prompt = data.get("prompt", "")
        state["exchange_num"] += 1
        append_entry(state, "PROMPT", state["exchange_num"], prompt, state.get("model", DEFAULT_MODEL))
        update_header(state, session_id)
        save_state(session_id, state)

    elif event == "Stop":
        transcript_path = data.get("transcript_path", "")
        text, model = extract_final_response(transcript_path)
        state["model"] = model
        if text:
            append_entry(state, "RESPONSE", state["exchange_num"], text, model)
        update_header(state, session_id)
        save_state(session_id, state)

    print(json.dumps({}))


if __name__ == "__main__":
    main()
