from __future__ import annotations

import asyncio
from pathlib import Path

from nakheel.config import Settings
from nakheel.exceptions import ParseError
from nakheel.utils.text_cleaning import clean_text

try:
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption
except ImportError:  # pragma: no cover
    DocumentConverter = None
    InputFormat = None
    PdfFormatOption = None
    PdfPipelineOptions = None

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None


class DocumentParser:
    """Parse PDF files into normalized Markdown for downstream chunking."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._converter = None
        if DocumentConverter is not None and settings.PDF_PARSER_BACKEND.lower() == "docling":
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = settings.PDF_ENABLE_OCR
            pipeline_options.do_table_structure = settings.PDF_ENABLE_TABLE_STRUCTURE
            if settings.PDF_ENABLE_TABLE_STRUCTURE:
                pipeline_options.table_structure_options.do_cell_matching = True
            self._converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )

    def parse_to_markdown(self, pdf_path: Path, output_path: Path | None = None) -> tuple[str, int]:
        """Parse a PDF to Markdown and optionally persist the parsed artifact."""

        try:
            markdown, pages = self._parse(pdf_path)
        except ParseError:
            raise
        except Exception as exc:
            raise ParseError(f"Failed to parse document: {pdf_path.name}") from exc
        markdown = clean_text(markdown)
        if not markdown:
            raise ParseError("Parsed document was empty")
        if output_path is not None:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(markdown, encoding="utf-8")
        return markdown, pages

    async def parse_to_markdown_async(
        self, pdf_path: Path, output_path: Path | None = None
    ) -> tuple[str, int]:
        """Run PDF parsing in a worker thread to keep async routes responsive."""

        return await asyncio.to_thread(self.parse_to_markdown, pdf_path, output_path)

    def _parse(self, pdf_path: Path) -> tuple[str, int]:
        """Parse using the configured backend, with a lightweight fallback when available."""

        backend = self.settings.PDF_PARSER_BACKEND.lower()
        if backend == "pypdf":
            return self._parse_with_pypdf(pdf_path)
        if backend == "docling" and self._converter is not None:
            try:
                return self._parse_with_docling(pdf_path)
            except Exception:
                if PdfReader is not None:
                    return self._parse_with_pypdf(pdf_path)
                raise
        if PdfReader is not None:
            return self._parse_with_pypdf(pdf_path)
        if self._converter is not None:
            return self._parse_with_docling(pdf_path)
        raise ParseError("No PDF parser dependency is installed")

    def _parse_with_docling(self, pdf_path: Path) -> tuple[str, int]:
        """Parse with Docling when advanced extraction is explicitly enabled."""

        assert self._converter is not None
        result = self._converter.convert(str(pdf_path))
        return result.document.export_to_markdown(), len(result.document.pages)

    def _parse_with_pypdf(self, pdf_path: Path) -> tuple[str, int]:
        """Parse with pypdf for a lightweight default path."""

        if PdfReader is None:
            raise ParseError("No PDF parser dependency is installed")
        reader = PdfReader(str(pdf_path))
        return "\n\n".join((page.extract_text() or "") for page in reader.pages), len(reader.pages)
