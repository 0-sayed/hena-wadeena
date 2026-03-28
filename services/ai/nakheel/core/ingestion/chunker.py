from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime

from nakheel.models.chunk import Chunk
from nakheel.utils.ids import new_id
from nakheel.utils.language import detect_language
from nakheel.utils.text_cleaning import clean_text
from nakheel.utils.token_counter import count_tokens


HEADING_PATTERN = re.compile(r"^(#{1,4})\s+(.+)$", re.MULTILINE)
PARAGRAPH_SPLIT_RE = re.compile(r"\n\s*\n")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[\.\!\?؟])\s+")


@dataclass(slots=True)
class Section:
    level: int
    title: str
    content: str
    parent_title: str | None = None


def detect_sections(markdown: str) -> list[Section]:
    matches = list(HEADING_PATTERN.finditer(markdown))
    if not matches:
        return [Section(level=1, title="Document", content=markdown)]
    sections: list[Section] = []
    stack: list[tuple[int, str]] = []
    for index, match in enumerate(matches):
        level = len(match.group(1))
        title = match.group(2).strip()
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        content = markdown[start:end].strip()
        while stack and stack[-1][0] >= level:
            stack.pop()
        parent_title = stack[-1][1] if stack else None
        sections.append(Section(level=level, title=title, content=content, parent_title=parent_title))
        stack.append((level, title))
    return sections


class SectionChunker:
    def __init__(self, min_tokens: int, max_tokens: int, overlap_ratio: float) -> None:
        self.min_tokens = min_tokens
        self.max_tokens = max_tokens
        self.overlap_ratio = overlap_ratio

    def chunk_markdown(self, markdown: str, doc_id: str) -> list[Chunk]:
        sections = self._merge_small_sections(detect_sections(markdown))
        chunks: list[Chunk] = []
        chunk_index = 0
        previous_text = ""
        for section in sections:
            for raw_piece in self._split_section(section.content):
                raw_piece = clean_text(raw_piece)
                if not raw_piece:
                    continue
                overlap_prev = self._overlap_prefix(previous_text) if previous_text else None
                text = f"{overlap_prev} {raw_piece}".strip() if overlap_prev else raw_piece
                token_count = count_tokens(text)
                if token_count < self.min_tokens and chunks:
                    chunks[-1].text = f"{chunks[-1].text}\n\n{text}".strip()
                    chunks[-1].token_count = count_tokens(chunks[-1].text)
                    chunks[-1].char_count = len(chunks[-1].text)
                    previous_text = chunks[-1].text
                    continue
                language = detect_language(text).code
                chunk = Chunk(
                    chunk_id=new_id("chk"),
                    doc_id=doc_id,
                    chunk_index=chunk_index,
                    section_title=section.title,
                    parent_section=section.parent_title,
                    text=text,
                    text_ar=text if language.startswith("ar") else None,
                    language=language,
                    page_numbers=[],
                    token_count=token_count,
                    char_count=len(text),
                    overlap_prev=overlap_prev,
                    overlap_next=None,
                    created_at=datetime.now(UTC),
                )
                if chunks and overlap_prev:
                    chunks[-1].overlap_next = overlap_prev
                chunks.append(chunk)
                previous_text = text
                chunk_index += 1
        return chunks

    def _merge_small_sections(self, sections: list[Section]) -> list[Section]:
        merged: list[Section] = []
        buffer: Section | None = None
        for section in sections:
            tokens = count_tokens(section.content)
            if buffer is not None:
                buffer.content = f"{buffer.content}\n\n# {section.title}\n{section.content}".strip()
                if count_tokens(buffer.content) >= self.min_tokens:
                    merged.append(buffer)
                    buffer = None
                continue
            if tokens < self.min_tokens:
                buffer = Section(section.level, section.title, section.content, section.parent_title)
            else:
                merged.append(section)
        if buffer is not None:
            merged.append(buffer)
        return merged

    def _split_section(self, text: str) -> list[str]:
        if count_tokens(text) <= self.max_tokens:
            return [text]
        paragraphs = [piece.strip() for piece in PARAGRAPH_SPLIT_RE.split(text) if piece.strip()]
        chunks: list[str] = []
        current = ""
        for paragraph in paragraphs:
            candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
            if count_tokens(candidate) <= self.max_tokens:
                current = candidate
                continue
            if current:
                chunks.append(current)
            if count_tokens(paragraph) <= self.max_tokens:
                current = paragraph
                continue
            sentences = [piece.strip() for piece in SENTENCE_SPLIT_RE.split(paragraph) if piece.strip()]
            sentence_buffer = ""
            for sentence in sentences:
                sentence_candidate = f"{sentence_buffer} {sentence}".strip() if sentence_buffer else sentence
                if count_tokens(sentence_candidate) <= self.max_tokens:
                    sentence_buffer = sentence_candidate
                else:
                    if sentence_buffer:
                        chunks.append(sentence_buffer)
                    sentence_buffer = sentence
            if sentence_buffer:
                current = sentence_buffer
        if current:
            chunks.append(current)
        return chunks

    def _overlap_prefix(self, text: str) -> str | None:
        tokens = text.split()
        if not tokens:
            return None
        overlap_size = max(1, round(len(tokens) * self.overlap_ratio))
        return " ".join(tokens[-overlap_size:])

