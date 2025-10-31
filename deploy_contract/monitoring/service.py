from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from decimal import Decimal
from web3 import Web3

from .config import MonitorConfig, load_config
from .connections import Web3ConnectionManager
from .executor import SwapExecution, SwapExecutor
from .inventory import ERC20_ABI, InventoryFetcher
from .price_sources import PriceResult, build_price_source
from .strategy import StrategyDecision, StrategyEngine
from .token_discovery import discover_new_tokens


@dataclass
class EvaluationContext:
    token_address: str
    pool_address: str
    price: PriceResult
    decision: StrategyDecision
    execution: Optional[SwapExecution]


class MonitorService:
    def __init__(
        self,
        config: MonitorConfig,
        *,
        auto_discover: bool = False,
        discovery_lookback: int = 5_000,
    ) -> None:
        self._config = config
        self._config_path = config.source_path
        self._auto_discover = auto_discover
        self._discovery_lookback = discovery_lookback
        self._last_discovery_block: Optional[int] = None
        self._connection_manager = Web3ConnectionManager(config.rpc)
        self._strategy = StrategyEngine(config)
        self._price_sources = self._prepare_price_sources()
        self._quote_decimals_cache: Dict[str, int] = {}

    async def run_once(self) -> List[EvaluationContext]:
        bundle = await self._connection_manager.get_connections()
        http_w3 = bundle.http

        if self._auto_discover and self._config_path:
            self._maybe_discover_tokens(http_w3)

        inventory_fetcher = InventoryFetcher(http_w3, self._config.vault_address)
        inventories = inventory_fetcher.fetch(self._config.tokens)

        executor = SwapExecutor(http_w3, self._config)
        contexts: List[EvaluationContext] = []

        for token in self._config.tokens:
            inventory = inventories.get(Web3.to_checksum_address(token.address).lower())
            if inventory is None:
                continue

            for pool in token.pools:
                price_source = self._price_sources[(token.address.lower(), pool.address.lower())]
                quote_decimals = self._get_token_decimals(http_w3, pool.quote_token)
                price = price_source.fetch(
                    http_w3,
                    inventory.decimals,
                    quote_decimals,
                )
                decision = self._strategy.evaluate(inventory, pool, price)
                execution: Optional[SwapExecution] = None

                if decision.should_swap:
                    execution = executor.build_execution(decision, pool, price.price)

                contexts.append(
                    EvaluationContext(
                        token_address=token.address,
                        pool_address=pool.address,
                        price=price,
                        decision=decision,
                        execution=execution,
                    )
                )
        return contexts

    async def run_forever(self, interval_seconds: int = 60) -> None:
        while True:
            start = time.time()
            try:
                contexts = await self.run_once()
                self._log_cycle(contexts)
            except Exception as exc:
                print(f"[monitor] cycle error: {exc}")
            elapsed = time.time() - start
            await asyncio.sleep(max(0, interval_seconds - elapsed))

    def _log_cycle(self, contexts: List[EvaluationContext]) -> None:
        for context in contexts:
            token = context.decision.token_inventory.symbol
            change = context.decision.price_change_bps
            reason = context.decision.reason
            price = context.price.price
            if context.execution:
                print(
                    f"[monitor] SELL {token}: price={price} change={change}bps reason={reason} amount={context.execution.amount_in}"
                )
            else:
                print(f"[monitor] HOLD {token}: price={price} change={change}bps reason={reason}")

    def _prepare_price_sources(self):
        sources: Dict[Tuple[str, str], any] = {}
        for token in self._config.tokens:
            for pool in token.pools:
                key = (token.address.lower(), pool.address.lower())
                sources[key] = build_price_source(pool)
        return sources

    def _get_token_decimals(self, w3: Web3, address: str) -> int:
        key = address.lower()
        if key not in self._quote_decimals_cache:
            contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=ERC20_ABI)
            decimals = contract.functions.decimals().call()
            self._quote_decimals_cache[key] = int(decimals)
        return self._quote_decimals_cache[key]

    def _maybe_discover_tokens(self, w3: Web3) -> None:
        if not self._config_path:
            return

        current_block = w3.eth.block_number
        if self._last_discovery_block is None:
            start_block = max(0, current_block - self._discovery_lookback)
        else:
            start_block = self._last_discovery_block + 1
        if start_block > current_block:
            start_block = current_block

        discovered = discover_new_tokens(
            self._config_path,
            rpc_http=self._config.rpc.http,
            vault_address=self._config.vault_address,
            from_block=start_block,
            to_block=current_block,
            w3=w3,
        )

        self._last_discovery_block = current_block

        if discovered:
            print(
                "[monitor] discovered new tokens: "
                + ", ".join(token.address for token in discovered)
            )
            self._config = load_config(self._config_path)
            self._config_path = self._config.source_path
            self._strategy = StrategyEngine(self._config)
            self._price_sources = self._prepare_price_sources()


def load_service_from_file(
    path: str,
    *,
    auto_discover: bool = False,
    discovery_lookback: int = 5_000,
) -> MonitorService:
    config = load_config(path)
    return MonitorService(
        config,
        auto_discover=auto_discover,
        discovery_lookback=discovery_lookback,
    )
