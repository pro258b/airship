from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

from web3 import Web3
from web3.types import LogReceipt

from .inventory import ERC20_ABI
from .pool_lookup import find_pools

TRANSFER_TOPIC = '0x' + Web3.keccak(text="Transfer(address,address,uint256)").hex()
ENV_PATTERN = re.compile(r"\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?")


@dataclass
class DiscoveredToken:
    address: str
    symbol: Optional[str]
    decimals: Optional[int]


def _normalise_topic_address(address: str) -> str:
    return "0x" + address.lower().replace("0x", "").rjust(64, "0")


def _extract_token_metadata(w3: Web3, token_address: str) -> Tuple[Optional[str], Optional[int]]:
    contract = w3.eth.contract(address=Web3.to_checksum_address(token_address), abi=ERC20_ABI)
    symbol: Optional[str]
    decimals: Optional[int]
    try:
        symbol = contract.functions.symbol().call()
        if isinstance(symbol, bytes):
            symbol = symbol.decode("utf-8", errors="ignore").strip("\x00") or None
    except Exception:
        symbol = None
    try:
        decimals_value = contract.functions.decimals().call()
        decimals = int(decimals_value)
    except Exception:
        decimals = None
    return symbol, decimals


def _append_token_entry(
    config_data: dict,
    address_value: str,
    symbol: Optional[str],
    decimals: Optional[int],
    default_threshold_bps: int,
) -> None:
    entry = {
        "address": address_value,
        "symbol": symbol,
        "decimals": decimals,
        "threshold_bps": default_threshold_bps,
        "pools": [],
    }
    config_data.setdefault("tokens", []).append(entry)


def _extract_env_name_from_placeholder(value: str) -> Optional[str]:
    match = ENV_PATTERN.fullmatch(value.strip())
    if match:
        return match.group(1)
    return None


def _derive_env_name(token_address: str) -> str:
    return f"MONITOR_TOKEN_{token_address[2:].upper()}"


def _resolve_config_value(value: str) -> str:
    env_name = _extract_env_name_from_placeholder(value)
    if env_name:
        env_value = os.getenv(env_name)
        if env_value is None:
            raise EnvironmentError(f"Environment variable '{env_name}' is not set")
        return env_value
    return value


def discover_new_tokens(
    config_path: str | Path,
    *,
    rpc_http: Optional[str] = None,
    vault_address: Optional[str] = None,
    from_block: int,
    to_block: Optional[int] = None,
    w3: Optional[Web3] = None,
) -> List[DiscoveredToken]:
    """Find new ERC-20 tokens transferred into the vault and append them to the config.

    The search scans Transfer events with the vault address as the recipient. Newly
    discovered tokens are added to the configuration file with placeholder pool data
    so they can be inspected and configured later.
    """

    config_path = Path(config_path)
    config_data = json.loads(config_path.read_text())

    raw_rpc_http = rpc_http or config_data["rpc"]["http"]
    raw_vault_address = vault_address or config_data["vault_address"]

    rpc_http_value = (
        _resolve_config_value(raw_rpc_http)
        if isinstance(raw_rpc_http, str)
        else raw_rpc_http
    )
    vault_address_value = (
        _resolve_config_value(raw_vault_address)
        if isinstance(raw_vault_address, str)
        else raw_vault_address
    )

    local_w3 = w3 or Web3(Web3.HTTPProvider(rpc_http_value))
    if to_block is None:
        to_block = local_w3.eth.block_number

    vault_topic = _normalise_topic_address(vault_address_value)
    logs: Iterable[LogReceipt] = local_w3.eth.get_logs(
        {
            "fromBlock": from_block,
            "toBlock": to_block,
            "topics": [TRANSFER_TOPIC, None, vault_topic],
        }
    )

    existing_addresses: set[str] = set()
    existing_placeholders: set[str] = set()

    for token in config_data.get("tokens", []):
        address_value = token.get("address")
        if not isinstance(address_value, str):
            continue
        env_name = _extract_env_name_from_placeholder(address_value)
        if env_name:
            existing_placeholders.add(address_value)
            env_value = os.getenv(env_name)
            if env_value:
                try:
                    checksum = Web3.to_checksum_address(env_value)
                except ValueError:
                    continue
                existing_addresses.add(checksum.lower())
        else:
            try:
                checksum = Web3.to_checksum_address(address_value)
            except ValueError:
                continue
            existing_addresses.add(checksum.lower())
    discovered_tokens: List[DiscoveredToken] = []

    for log in logs:
        token_address = Web3.to_checksum_address(log["address"])
        checksum_lower = token_address.lower()
        if checksum_lower in existing_addresses:
            continue

        symbol, decimals = _extract_token_metadata(local_w3, token_address)
        env_name = _derive_env_name(token_address)
        placeholder = f"${env_name}"

        if placeholder in existing_placeholders:
            continue

        os.environ.setdefault(env_name, token_address)
        _append_token_entry(
            config_data,
            placeholder,
            symbol,
            decimals,
            config_data["strategy"].get("default_threshold_bps", 1000),
        )
        token_entry = config_data.setdefault("tokens", [])[-1]
        token_entry.setdefault("pools", [])

        existing_addresses.add(checksum_lower)
        existing_placeholders.add(placeholder)
        discovered_tokens.append(
            DiscoveredToken(address=token_address, symbol=symbol, decimals=decimals)
        )

        print(
            "[monitor] new token discovered: "
            f"{token_address} (env var {env_name}). "
            "Export this variable to persist the configuration."
        )

        try:
            pool_matches = find_pools(
                token_address=token_address,
                token_env_var=env_name,
                w3=local_w3,
            )
        except Exception as exc:  # pragma: no cover - network failure
            print(f"[monitor] pool lookup failed for {token_address}: {exc}")
            pool_matches = []

        for match in pool_matches:
            if match.pool_placeholder in existing_placeholders:
                continue

            pool_entry = {
                "type": match.dex,
                "address": match.pool_placeholder,
                "base_token": f"${env_name}",
                "quote_token": match.quote_placeholder,
                "metadata": match.metadata,
            }
            if match.fee is not None:
                pool_entry["fee"] = match.fee

            token_entry["pools"].append(pool_entry)
            existing_placeholders.add(match.pool_placeholder)
            existing_addresses.add(match.pool_address.lower())
            os.environ.setdefault(match.pool_env, match.pool_address)

            print(
                "[monitor] suggested pool: "
                f"{match.pool_address} (env var {match.pool_env}). "
                "Export this variable to enable automatic swaps."
            )

    if discovered_tokens:
        config_path.write_text(json.dumps(config_data, indent=2))

    return discovered_tokens
