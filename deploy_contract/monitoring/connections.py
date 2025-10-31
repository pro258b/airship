from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Optional

from web3 import Web3
from web3.providers.rpc import HTTPProvider

from .config import RpcConfig

try:  # pragma: no cover - optional dependency
    from web3 import AsyncWeb3
    from web3.providers.async_http import AsyncHTTPProvider
    from web3.providers.async_websocket import AsyncWebsocketProvider
except ImportError:  # pragma: no cover - optional dependency
    AsyncWeb3 = None  # type: ignore
    AsyncHTTPProvider = None  # type: ignore
    AsyncWebsocketProvider = None  # type: ignore

try:  # pragma: no cover - optional dependency
    from degenbot.connection import connection_manager as degen_connection_manager
except ImportError:  # pragma: no cover - optional dependency
    degen_connection_manager = None


@dataclass
class ConnectionBundle:
    http: Web3
    async_client: Optional["AsyncWeb3"]


class Web3ConnectionManager:
    def __init__(self, rpc: RpcConfig) -> None:
        self._rpc = rpc
        self._bundle: Optional[ConnectionBundle] = None
        self._lock = asyncio.Lock()

    async def get_connections(self) -> ConnectionBundle:
        async with self._lock:
            if self._bundle is None:
                self._bundle = await self._create_bundle()
        return self._bundle

    async def _create_bundle(self) -> ConnectionBundle:
        http_client = Web3(HTTPProvider(self._rpc.http))
        async_client: Optional["AsyncWeb3"] = None

        if AsyncWeb3 is not None:
            if self._rpc.websocket and AsyncWebsocketProvider is not None:
                async_client = AsyncWeb3(AsyncWebsocketProvider(self._rpc.websocket))
            elif AsyncHTTPProvider is not None:
                async_client = AsyncWeb3(AsyncHTTPProvider(self._rpc.http))

        if not http_client.is_connected():  # pragma: no cover - runtime guard
            raise ConnectionError(f"Failed to connect HTTP provider {self._rpc.http}")

        if async_client and degen_connection_manager is not None:
            try:
                chain_id = http_client.eth.chain_id
            except Exception:  # pragma: no cover - runtime guard
                chain_id = None
            if chain_id is not None:
                degen_connection_manager.connections[chain_id] = async_client

        return ConnectionBundle(http=http_client, async_client=async_client)
