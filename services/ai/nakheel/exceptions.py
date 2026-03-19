from __future__ import annotations

from typing import Any


class NakheelBaseException(Exception):
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    title: str = "Internal Server Error"

    def __init__(self, detail: str, extras: dict[str, Any] | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.extras = extras or {}


class BadRequestError(NakheelBaseException):
    status_code = 400
    error_code = "BAD_REQUEST"
    title = "Bad Request"


class DocumentNotFoundError(NakheelBaseException):
    status_code = 404
    error_code = "DOCUMENT_NOT_FOUND"
    title = "Document Not Found"


class DocumentBatchNotFoundError(NakheelBaseException):
    status_code = 404
    error_code = "DOCUMENT_BATCH_NOT_FOUND"
    title = "Document Batch Not Found"


class ParsedFileNotFoundError(NakheelBaseException):
    status_code = 404
    error_code = "PARSED_FILE_NOT_FOUND"
    title = "Parsed File Not Found"


class ParsedFileExpiredError(NakheelBaseException):
    status_code = 410
    error_code = "PARSED_FILE_EXPIRED"
    title = "Parsed File Expired"


class ParseError(NakheelBaseException):
    status_code = 422
    error_code = "PARSE_ERROR"
    title = "Document Parse Failed"


class IndexingError(NakheelBaseException):
    status_code = 500
    error_code = "INDEX_ERROR"
    title = "Document Index Failed"


class SessionNotFoundError(NakheelBaseException):
    status_code = 404
    error_code = "SESSION_NOT_FOUND"
    title = "Session Not Found"


class SessionExpiredError(NakheelBaseException):
    status_code = 410
    error_code = "SESSION_EXPIRED"
    title = "Session Expired"


class LLMError(NakheelBaseException):
    status_code = 502
    error_code = "LLM_ERROR"
    title = "Language Model Error"


class NotImplementedMvpError(NakheelBaseException):
    status_code = 400
    error_code = "NOT_IMPLEMENTED_IN_MVP"
    title = "Feature Not Implemented"
