from uuid import uuid4


def new_id(prefix: str | None = None) -> str:
    value = str(uuid4())
    return f"{prefix}-{value}" if prefix else value

