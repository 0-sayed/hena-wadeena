from nakheel.core.session.context_window import trim_history


def test_trim_history_keeps_latest_messages():
    messages = [{"role": "user", "content": f"message {index}"} for index in range(20)]
    trimmed = trim_history(messages, max_messages=10, token_budget=1000)
    assert len(trimmed) == 10
    assert trimmed[0]["content"] == "message 10"


def test_trim_history_respects_token_budget():
    messages = [{"role": "user", "content": "word " * 100}] * 5
    trimmed = trim_history(messages, max_messages=10, token_budget=50)
    assert trimmed == []

