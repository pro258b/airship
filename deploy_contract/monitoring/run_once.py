from __future__ import annotations
import asyncio, traceback

# from monitoring.service import load_service_from_file
from .service import load_service_from_file


monitor = load_service_from_file(
    "deploy_contract/monitoring/config.json",
    auto_discover=True,
    discovery_lookback=10_000,
)


async def main():
    try:
        await monitor.run_once()
    except Exception:
        traceback.print_exc()


asyncio.run(main())
