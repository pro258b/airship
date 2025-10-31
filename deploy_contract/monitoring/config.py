from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class PoolConfig:
    type: str
    address: str
    base_token: str
    quote_token: str
    fee: Optional[int] = None
    threshold_bps: Optional[int] = None
    twap_seconds: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TokenConfig:
    address: str
    symbol: Optional[str] = None
    decimals: Optional[int] = None
    pools: List[PoolConfig] = field(default_factory=list)
    threshold_bps: Optional[int] = None


@dataclass
class StrategyConfig:
    sell_percentage: int
    cooldown_seconds: int
    default_slippage_bps: int
    default_threshold_bps: int
    use_twap: bool = True

    @property
    def sell_ratio(self) -> float:
        return self.sell_percentage / 10_000


@dataclass
class RpcConfig:
    http: str
    websocket: Optional[str] = None


@dataclass
class MonitorConfig:
    vault_address: str
    executor_address: str
    rpc: RpcConfig
    tokens: List[TokenConfig]
    strategy: StrategyConfig
    state_file: Optional[Path] = None
    source_path: Optional[Path] = None


_ENV_PATTERN = re.compile(r"\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?")


def _resolve_env(value: Any) -> Any:
    if isinstance(value, str):
        match = _ENV_PATTERN.fullmatch(value.strip())
        if match:
            env_var = match.group(1)
            env_value = os.getenv(env_var)
            if env_value is None:
                raise EnvironmentError(f"Environment variable '{env_var}' is not set")
            return env_value
        return value
    if isinstance(value, list):
        return [_resolve_env(item) for item in value]
    if isinstance(value, dict):
        return {key: _resolve_env(item) for key, item in value.items()}
    return value


def _load_pool_config(raw: Dict[str, Any]) -> PoolConfig:
    return PoolConfig(
        type=raw["type"],
        address=_resolve_env(raw["address"]),
        base_token=_resolve_env(raw["base_token"]),
        quote_token=_resolve_env(raw["quote_token"]),
        fee=raw.get("fee"),
        threshold_bps=raw.get("threshold_bps"),
        twap_seconds=raw.get("twap_seconds"),
        metadata=_resolve_env(raw.get("metadata", {})),
    )


def _load_token_config(raw: Dict[str, Any]) -> TokenConfig:
    pools = [_load_pool_config(pool) for pool in raw.get("pools", [])]
    return TokenConfig(
        address=_resolve_env(raw["address"]),
        symbol=_resolve_env(raw.get("symbol")),
        decimals=_resolve_env(raw.get("decimals")),
        pools=pools,
        threshold_bps=raw.get("threshold_bps"),
    )


def _load_strategy_config(raw: Dict[str, Any]) -> StrategyConfig:
    return StrategyConfig(
        sell_percentage=raw["sell_percentage"],
        cooldown_seconds=raw.get("cooldown_seconds", 0),
        default_slippage_bps=raw.get("default_slippage_bps", 100),
        default_threshold_bps=raw.get("default_threshold_bps", 1000),
        use_twap=raw.get("use_twap", True),
    )


def load_config(path: str | Path) -> MonitorConfig:
    parsed_path = Path(path)
    data = json.loads(parsed_path.read_text())

    resolved = _resolve_env(data)

    tokens = [_load_token_config(raw_token) for raw_token in resolved["tokens"]]

    rpc_raw = resolved["rpc"]
    rpc = RpcConfig(http=rpc_raw["http"], websocket=rpc_raw.get("websocket"))

    strategy = _load_strategy_config(resolved["strategy"])

    state_file = resolved.get("state_file")
    state_path = Path(state_file) if state_file else None

    return MonitorConfig(
        vault_address=resolved["vault_address"],
        executor_address=resolved["executor_address"],
        rpc=rpc,
        tokens=tokens,
        strategy=strategy,
        state_file=state_path,
        source_path=parsed_path,
    )


def load_default_config() -> MonitorConfig:
    default_path = Path(__file__).with_name("config.example.json")
    return load_config(default_path)
