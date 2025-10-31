from __future__ import annotations

import json
import time
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Dict, Optional

from .config import MonitorConfig, PoolConfig
from .inventory import TokenInventory
from .price_sources import PriceResult


@dataclass
class StrategyState:
    baseline_price: Decimal
    last_trigger_ts: Optional[int]


@dataclass
class StrategyDecision:
    should_swap: bool
    token_inventory: TokenInventory
    pool: PoolConfig
    price: Decimal
    price_change_bps: int
    sell_amount: int
    slippage_bps: int
    reason: str


class StrategyEngine:
    def __init__(self, config: MonitorConfig) -> None:
        self._config = config
        self._state: Dict[str, StrategyState] = {}
        self._state_path = config.state_file
        if self._state_path:
            self._load_state(self._state_path)

    def _state_key(self, token_address: str, pool_address: str) -> str:
        return f"{token_address.lower()}::{pool_address.lower()}"

    def evaluate(
        self,
        token_inventory: TokenInventory,
        pool: PoolConfig,
        price: PriceResult,
        timestamp: Optional[int] = None,
    ) -> StrategyDecision:
        if timestamp is None:
            timestamp = int(time.time())

        slippage_bps = self._resolve_slippage(pool)
        state_key = self._state_key(token_inventory.config.address, pool.address)
        state = self._state.get(state_key)

        if price.price <= 0:
            return StrategyDecision(
                should_swap=False,
                token_inventory=token_inventory,
                pool=pool,
                price=price.price,
                price_change_bps=0,
                sell_amount=0,
                slippage_bps=slippage_bps,
                reason="invalid price",
            )

        if state is None:
            self._state[state_key] = StrategyState(baseline_price=price.price, last_trigger_ts=None)
            self._persist_state()
            return StrategyDecision(
                should_swap=False,
                token_inventory=token_inventory,
                pool=pool,
                price=price.price,
                price_change_bps=0,
                sell_amount=0,
                slippage_bps=slippage_bps,
                reason="baseline initialized",
            )

        if state.baseline_price <= 0:
            state.baseline_price = price.price
            self._persist_state()
            return StrategyDecision(
                should_swap=False,
                token_inventory=token_inventory,
                pool=pool,
                price=price.price,
                price_change_bps=0,
                sell_amount=0,
                slippage_bps=slippage_bps,
                reason="baseline reset",
            )

        change_ratio = (price.price / state.baseline_price) - Decimal(1)
        change_bps = int((change_ratio * Decimal(10_000)).to_integral_value(rounding="ROUND_DOWN"))

        threshold_bps = self._resolve_threshold(token_inventory, pool)
        if change_bps < threshold_bps:
            return StrategyDecision(
                should_swap=False,
                token_inventory=token_inventory,
                pool=pool,
                price=price.price,
                price_change_bps=change_bps,
                sell_amount=0,
                slippage_bps=slippage_bps,
                reason="threshold not met",
            )

        cooldown = self._resolve_cooldown(pool)
        if state.last_trigger_ts and timestamp - state.last_trigger_ts < cooldown:
            return StrategyDecision(
                should_swap=False,
                token_inventory=token_inventory,
                pool=pool,
                price=price.price,
                price_change_bps=change_bps,
                sell_amount=0,
                slippage_bps=slippage_bps,
                reason="cooldown active",
            )

        sell_amount = (
            token_inventory.raw_balance
            * self._config.strategy.sell_percentage
            // 10_000
        )

        if sell_amount == 0:
            return StrategyDecision(
                should_swap=False,
                token_inventory=token_inventory,
                pool=pool,
                price=price.price,
                price_change_bps=change_bps,
                sell_amount=0,
                slippage_bps=slippage_bps,
                reason="insufficient balance",
            )

        self._state[state_key] = StrategyState(baseline_price=price.price, last_trigger_ts=timestamp)
        self._persist_state()

        return StrategyDecision(
            should_swap=True,
            token_inventory=token_inventory,
            pool=pool,
            price=price.price,
            price_change_bps=change_bps,
            sell_amount=sell_amount,
            slippage_bps=slippage_bps,
            reason="price threshold met",
        )

    def _resolve_threshold(self, token: TokenInventory, pool: PoolConfig) -> int:
        if pool.threshold_bps is not None:
            return pool.threshold_bps
        if token.config.threshold_bps is not None:
            return token.config.threshold_bps
        return self._config.strategy.default_threshold_bps

    def _resolve_slippage(self, pool: PoolConfig) -> int:
        metadata_value = pool.metadata.get("slippage_bps") if pool.metadata else None
        if metadata_value is not None:
            return int(metadata_value)
        return self._config.strategy.default_slippage_bps

    def _resolve_cooldown(self, pool: PoolConfig) -> int:
        metadata_value = pool.metadata.get("cooldown_seconds") if pool.metadata else None
        if metadata_value is not None:
            return int(metadata_value)
        return self._config.strategy.cooldown_seconds

    def _persist_state(self) -> None:
        if not self._state_path:
            return
        payload = {
            key: {
                "baseline": str(value.baseline_price),
                "last_trigger": value.last_trigger_ts,
            }
            for key, value in self._state.items()
        }
        try:
            self._state_path.write_text(json.dumps(payload, indent=2))
        except Exception:
            pass

    def _load_state(self, path: Path) -> None:
        if not path.exists():
            return
        try:
            raw = json.loads(path.read_text())
        except Exception:
            return
        for key, entry in raw.items():
            baseline = Decimal(entry["baseline"])
            last_trigger = entry.get("last_trigger")
            self._state[key] = StrategyState(baseline_price=baseline, last_trigger_ts=last_trigger)
