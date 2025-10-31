from __future__ import annotations

import asyncio
from pathlib import Path

from .service import load_service_from_file


def main() -> None:
    config_path = Path(__file__).with_name("config.json")
    if not config_path.exists():
        example = Path(__file__).with_name("config.example.json")
        raise FileNotFoundError(
            f"{config_path} not found. Copy {example.name} and adjust it before running."
        )
    try:
        monitor = load_service_from_file(
            str(config_path),
            auto_discover=True,
            discovery_lookback=10_000,
        )
    except EnvironmentError as exc:
        raise SystemExit(str(exc)) from exc
    asyncio.run(monitor.run_forever(interval_seconds=120))


if __name__ == "__main__":
    main()