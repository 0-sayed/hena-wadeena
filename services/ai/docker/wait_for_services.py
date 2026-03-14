from __future__ import annotations

import os
import socket
import subprocess
import sys
import time


def wait_for(host: str, port: int, service_name: str, timeout_seconds: int = 90) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"{service_name} is reachable at {host}:{port}")
                return
        except OSError:
            time.sleep(2)
    raise RuntimeError(f"Timed out waiting for {service_name} at {host}:{port}")


def main() -> int:
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://mongo:27017")
    qdrant_host = os.getenv("QDRANT_HOST", "qdrant")
    qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))

    mongo_host_port = mongo_uri.split("://", 1)[-1].split("/", 1)[0].split(",")[0]
    mongo_host, mongo_port = mongo_host_port.split(":")

    wait_for(mongo_host, int(mongo_port), "MongoDB")
    wait_for(qdrant_host, qdrant_port, "Qdrant")

    process = subprocess.run(
        [
            "uvicorn",
            "main:app",
            "--host",
            "0.0.0.0",
            "--port",
            os.getenv("APP_PORT", "8000"),
        ],
        check=False,
    )
    return process.returncode


if __name__ == "__main__":
    sys.exit(main())

