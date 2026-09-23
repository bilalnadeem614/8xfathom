import os

from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY")

_client: DeepgramClient | None = None


def get_deepgram() -> DeepgramClient:
    global _client
    if _client is None:
        if not DEEPGRAM_API_KEY:
            raise RuntimeError("DEEPGRAM_API_KEY must be set")
        _client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
    return _client


def transcribe_audio(file_bytes: bytes) -> list[dict]:
    """Transcribe audio/video bytes with Deepgram, diarized and grouped into speaker turns."""
    response = get_deepgram().listen.v1.media.transcribe_file(
        request=file_bytes,
        model="nova-3",
        diarize=True,
        smart_format=True,
        punctuate=True,
        utterances=True,
    )

    utterances = response.results.utterances or []
    return [
        {
            "speaker": f"Speaker {u.speaker}" if u.speaker is not None else None,
            "start_time": u.start,
            "end_time": u.end,
            "text": u.transcript,
        }
        for u in utterances
        if u.transcript
    ]
