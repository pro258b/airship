from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional

from web3 import Web3

from .quote_sets import QuoteCandidate, load_quote_candidates
from .v2 import V2Pool, find_uniswap_v2_pools
from .v3 import V3Pool, find_uniswap_v3_pools

_DEFAULT_RPC_ENV = 'MONITOR_RPC_HTTP'
_DEFAULT_V2_FACTORY_ENV = 'UNIV2_FACTORY'
_DEFAULT_V3_FACTORY_ENV = 'UNIV3_FACTORY'
_DEFAULT_V2_ROUTER_ENV = 'UNIV2_ROUTER'
_DEFAULT_V3_ROUTER_ENV = 'UNIV3_ROUTER'
_DEFAULT_V3_FEE_ENV = 'UNIV3_FEE_TIERS'
_PLACEHOLDER_PREFIX = '$'


@dataclass
class PoolMatch:
    pool_address: str
    pool_env: str
    pool_placeholder: str
    quote_address: str
    quote_env: str
    quote_placeholder: str
    dex: str
    router_env: str
    router_placeholder: str
    metadata: Dict[str, object] = field(default_factory=dict)
    fee: Optional[int] = None


def _get_env_value(env_var: str) -> str:
    value = os.getenv(env_var)
    if not value:
        raise EnvironmentError(f"Environment variable '{env_var}' is not set")
    return value


def _get_web3(rpc_env: str = _DEFAULT_RPC_ENV, rpc_override: Optional[str] = None) -> Web3:
    rpc_url = rpc_override or _get_env_value(rpc_env)
    return Web3(Web3.HTTPProvider(rpc_url))


def _parse_fee_tiers(env_var: str = _DEFAULT_V3_FEE_ENV) -> Iterable[int]:
    raw = os.getenv(env_var)
    if not raw:
        return [500, 3_000, 10_000]
    raw = raw.strip()
    if raw.startswith('['):
        try:
            values = json.loads(raw)
        except json.JSONDecodeError as exc:  # pragma: no cover
            raise ValueError(f"Environment variable '{env_var}' must be JSON array") from exc
        if not isinstance(values, list):
            raise ValueError(f"Environment variable '{env_var}' must be JSON array")
        return [int(item) for item in values]
    return [int(part.strip()) for part in raw.split(',') if part.strip()]


def _normalise_env_fragment(value: str) -> str:
    return re.sub(r'[^A-Z0-9]+', '_', value.upper()).strip('_')


def _derive_pool_env(token_env: str, quote_env: str, dex: str, fee: Optional[int]) -> str:
    parts = [dex.upper(), _normalise_env_fragment(token_env), _normalise_env_fragment(quote_env)]
    if fee is not None:
        parts.append(f'FEE{fee}')
    fragment = '_'.join(parts)
    fragment = _normalise_env_fragment(fragment)
    return f'MONITOR_POOL_{fragment}'


def _build_v2_matches(
    w3: Web3,
    token_address: str,
    token_env: str,
    quotes: List[QuoteCandidate],
    *,
    min_token_reserve: int,
) -> List[PoolMatch]:
    factory_env = _DEFAULT_V2_FACTORY_ENV
    try:
        factory_address = _get_env_value(factory_env)
    except EnvironmentError:
        return []

    router_env = _DEFAULT_V2_ROUTER_ENV
    router_address = _get_env_value(router_env)
    _ = Web3.to_checksum_address(router_address)  # validate

    pools: List[V2Pool] = find_uniswap_v2_pools(
        w3,
        factory_address=factory_address,
        token_address=token_address,
        quote_candidates=quotes,
        min_token_reserve=min_token_reserve,
    )

    token_placeholder = _PLACEHOLDER_PREFIX + token_env
    matches: List[PoolMatch] = []

    for pool in pools:
        pool_env = _derive_pool_env(token_env, pool.quote.env_var, 'v2', None)
        pool_placeholder = _PLACEHOLDER_PREFIX + pool_env
        metadata = {
            'router': _PLACEHOLDER_PREFIX + router_env,
            'path': [token_placeholder, pool.quote.placeholder],
            'deadline_buffer': 600,
        }
        matches.append(
            PoolMatch(
                pool_address=pool.pool_address,
                pool_env=pool_env,
                pool_placeholder=pool_placeholder,
                quote_address=pool.quote.address,
                quote_env=pool.quote.env_var,
                quote_placeholder=pool.quote.placeholder,
                dex='uniswap_v2',
                router_env=router_env,
                router_placeholder=_PLACEHOLDER_PREFIX + router_env,
                metadata=metadata,
            )
        )

    return matches


def _build_v3_matches(
    w3: Web3,
    token_address: str,
    token_env: str,
    quotes: List[QuoteCandidate],
    *,
    min_liquidity: int,
) -> List[PoolMatch]:
    try:
        factory_address = _get_env_value(_DEFAULT_V3_FACTORY_ENV)
    except EnvironmentError:
        return []

    router_env = _DEFAULT_V3_ROUTER_ENV
    router_address = _get_env_value(router_env)
    _ = Web3.to_checksum_address(router_address)

    fee_tiers = _parse_fee_tiers()
    pools: List[V3Pool] = find_uniswap_v3_pools(
        w3,
        factory_address=factory_address,
        token_address=token_address,
        quote_candidates=quotes,
        fee_tiers=fee_tiers,
        min_liquidity=min_liquidity,
    )

    token_placeholder = _PLACEHOLDER_PREFIX + token_env
    matches: List[PoolMatch] = []

    for pool in pools:
        pool_env = _derive_pool_env(token_env, pool.quote.env_var, 'v3', pool.fee)
        pool_placeholder = _PLACEHOLDER_PREFIX + pool_env
        metadata = {
            'router': _PLACEHOLDER_PREFIX + router_env,
            'deadline_buffer': 600,
        }
        matches.append(
            PoolMatch(
                pool_address=pool.pool_address,
                pool_env=pool_env,
                pool_placeholder=pool_placeholder,
                quote_address=pool.quote.address,
                quote_env=pool.quote.env_var,
                quote_placeholder=pool.quote.placeholder,
                dex='uniswap_v3',
                fee=pool.fee,
                router_env=router_env,
                router_placeholder=_PLACEHOLDER_PREFIX + router_env,
                metadata=metadata,
            )
        )

    return matches


def find_pools(
    token_address: str,
    *,
    token_env_var: Optional[str] = None,
    w3: Optional[Web3] = None,
    include_v2: bool = True,
    include_v3: bool = True,
    min_v2_reserve: int = 0,
    min_v3_liquidity: int = 0,
) -> List[PoolMatch]:
    if not include_v2 and not include_v3:
        return []

    token_checksum = Web3.to_checksum_address(token_address)
    token_env = token_env_var or f'MONITOR_TOKEN_{token_checksum[2:].upper()}'

    local_w3 = w3 or _get_web3()
    quotes = load_quote_candidates()

    matches: List[PoolMatch] = []
    if include_v2:
        matches.extend(
            _build_v2_matches(
                local_w3,
                token_address=token_checksum,
                token_env=token_env,
                quotes=quotes,
                min_token_reserve=min_v2_reserve,
            )
        )
    if include_v3:
        matches.extend(
            _build_v3_matches(
                local_w3,
                token_address=token_checksum,
                token_env=token_env,
                quotes=quotes,
                min_liquidity=min_v3_liquidity,
            )
        )

    dedup: Dict[str, PoolMatch] = {}
    for match in matches:
        key = match.pool_address.lower()
        if key not in dedup:
            dedup[key] = match

    return list(dedup.values())
