from __future__ import annotations

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
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._converter = None
        if DocumentConverter is not None:
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True
            pipeline_options.do_table_structure = True
            pipeline_options.table_structure_options.do_cell_matching = True
            self._converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )

    def parse_to_markdown(self, pdf_path: Path, output_path: Path | None = None) -> tuple[str, int]:
        try:
            if self._converter is not None:
                result = self._converter.convert(str(pdf_path))
                markdown = result.document.export_to_markdown()
                pages = len(result.document.pages)
            elif PdfReader is not None:
                reader = PdfReader(str(pdf_path))
                pages = len(reader.pages)
                markdown = "\n\n".join((page.extract_text() or "") for page in reader.pages)
            else:
                raise ParseError("No PDF parser dependency is installed")
        except Exception as exc:
            raise ParseError("Failed to parse document") from exc
        markdown = clean_text(markdown)
        if not markdown:
            raise ParseError("Parsed document was empty")
        if output_path is not None:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(markdown, encoding="utf-8")
        return markdown, pages

