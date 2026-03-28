import pytest

from nakheel.main import root_health


@pytest.mark.asyncio
async def test_health_returns_ok():
    data = await root_health()
    assert data["status"] == "ok"
    assert data["service"] == "ai"
