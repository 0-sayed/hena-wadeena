from __future__ import annotations

import re
from dataclasses import dataclass

try:
    from langdetect import DetectorFactory, detect_langs
    DetectorFactory.seed = 0
except ImportError:  # pragma: no cover
    detect_langs = None

from nakheel.utils.text_cleaning import normalize_arabic


ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
LATIN_RE = re.compile(r"[A-Za-z]")
EGYPTIAN_MARKERS = {"ايه", "ازاي", "فين", "عايز", "عاوزه", "ممكن", "لسه", "بتاع", "دي", "ده"}


@dataclass(slots=True)
class LanguageDetectionResult:
    code: str
    script: str
    confidence: float


def detect_language(text: str) -> LanguageDetectionResult:
    stripped = text.strip()
    if not stripped:
        return LanguageDetectionResult(code="en", script="latin", confidence=0.0)

    has_arabic = bool(ARABIC_RE.search(stripped))
    has_latin = bool(LATIN_RE.search(stripped))
    script = "mixed" if has_arabic and has_latin else "arabic" if has_arabic else "latin"

    if has_arabic:
        normalized = normalize_arabic(stripped.lower())
        words = set(normalized.split())
        if words & EGYPTIAN_MARKERS:
            return LanguageDetectionResult(code="ar-eg", script=script, confidence=0.92)
        if has_latin:
            return LanguageDetectionResult(code="mixed", script=script, confidence=0.75)
        return LanguageDetectionResult(code="ar-msa", script=script, confidence=0.80)

    if detect_langs is not None:
        try:
            detected = detect_langs(stripped)[0]
            code = "en" if detected.lang == "en" else detected.lang
            return LanguageDetectionResult(code=code, script=script, confidence=float(detected.prob))
        except Exception:
            pass

    return LanguageDetectionResult(code="en", script=script, confidence=0.60)
