from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Iterable, List

from web3 import Web3

_PLACEHOLDER_PREFIX = '$'
_PLACEHOLDER_START = '$' + '{'
_PLACEHOLDER_END = '}'


@dataclass
class QuoteCandidate:
    env_var: str
    placeholder: str
    address: str


def _strip_placeholder(value: str) -> str:
    value = value.strip()
    if value.startswith(_PLACEHOLDER_START) and value.endswith(_PLACEHOLDER_END):
        return value[2:-1]
    if value.startswith(_PLACEHOLDER_PREFIX):
        return value[1:]
    return value


def _ensure_placeholder(value: str) -> str:
    value = value.strip()
    if value.startswith(_PLACEHOLDER_START) and value.endswith(_PLACEHOLDER_END):
        return value
    if value.startswith(_PLACEHOLDER_PREFIX):
        return value
    return f'{_PLACEHOLDER_PREFIX}{value}'


def _load_candidates_raw(raw_value: str) -> Iterable[str]:
    raw_value = raw_value.strip()
    if not raw_value:
        return []
    if raw_value.startswith('['):
        try:
            parsed = json.loads(raw_value)
        except json.JSONDecodeError as exc:  # pragma: no cover - configuration time error
            raise ValueError('MONITOR_QUOTE_CANDIDATES must be valid JSON or comma list') from exc
        if not isinstance(parsed, list):
            raise ValueError('MONITOR_QUOTE_CANDIDATES JSON must be an array')
        return [str(item).strip() for item in parsed if str(item).strip()]
    return [part.strip() for part in raw_value.split(',') if part.strip()]


def load_quote_candidates(env_var: str = 'MONITOR_QUOTE_CANDIDATES') -> List[QuoteCandidate]:
    raw = os.getenv(env_var)
    if not raw:
        raise EnvironmentError(f"Environment variable '{env_var}' is not set")

    entries = _load_candidates_raw(raw)
    candidates: List[QuoteCandidate] = []

    for entry in entries:
        env_name = _strip_placeholder(entry)
        if not env_name:
            continue
        address = os.getenv(env_name)
        if address is None:
            raise EnvironmentError(
                f"Environment variable '{env_name}' referenced in {env_var} is not set"
            )
        checksum = Web3.to_checksum_address(address)
        placeholder = _ensure_placeholder(entry)
        candidates.append(QuoteCandidate(env_var=env_name, placeholder=placeholder, address=checksum))

    if not candidates:
        raise ValueError(f"Environment variable '{env_var}' did not yield any quote tokens")

    return candidates
