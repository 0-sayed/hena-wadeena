from nakheel.core.ingestion.chunker import SectionChunker, detect_sections


def test_detect_sections_finds_headings():
    markdown = "# Intro\nHello\n\n## Details\nMore text"
    sections = detect_sections(markdown)
    assert len(sections) == 2
    assert sections[0].title == "Intro"
    assert sections[1].parent_title == "Intro"


def test_chunker_applies_overlap_for_large_section():
    words = " ".join(f"word{i}" for i in range(20)) + ". "
    long_text = words * 6
    markdown = f"# Intro\n{long_text}\n\n# Extra\n{long_text}"
    chunker = SectionChunker(min_tokens=5, max_tokens=20, overlap_ratio=0.2)
    chunks = chunker.chunk_markdown(markdown, "doc-1")
    assert len(chunks) > 2
    assert any(chunk.overlap_prev for chunk in chunks[1:])
