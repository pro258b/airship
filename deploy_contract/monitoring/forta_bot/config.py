import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Set

DEFAULT_CONFIG_PATH = Path(__file__).with_name("config.json")
ENV_CONFIG_PATH = "FORTA_BOT_CONFIG"
ENV_VAULTS = "FORTA_VAULT_ADDRESSES"
ENV_TOKENS = "FORTA_TOKEN_WHITELIST"
ENV_MIN_RAW = "FORTA_MIN_TRANSFER_RAW"


@dataclass(frozen=True)
class Settings:
    vault_addresses: Set[str]
    token_whitelist: Set[str]
    min_transfer_raw: int


def _normalise_addresses(values: Iterable[str]) -> Set[str]:
    normalised = set()
    for value in values or []:
        if not value:
            continue
        normalised.add(value.lower())
    return normalised


def _load_json_config(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _split_env_list(raw: str) -> Set[str]:
    if not raw:
        return set()
    return _normalise_addresses(part.strip() for part in raw.split(","))


def load_settings() -> Settings:
    env_path = os.environ.get(ENV_CONFIG_PATH)
    config_path = Path(env_path) if env_path else DEFAULT_CONFIG_PATH
    payload = _load_json_config(config_path)

    vault_from_env = _split_env_list(os.environ.get(ENV_VAULTS, ""))
    token_from_env = _split_env_list(os.environ.get(ENV_TOKENS, ""))

    vaults_cfg = payload.get("vault_addresses", [])
    tokens_cfg = payload.get("token_whitelist", [])

    vault_addresses = vault_from_env or _normalise_addresses(vaults_cfg)
    token_whitelist = token_from_env or _normalise_addresses(tokens_cfg)

    min_transfer_raw = int(
        os.environ.get(
            ENV_MIN_RAW,
            payload.get("min_transfer_raw", 0),
        )
    )

    return Settings(
        vault_addresses=vault_addresses,
        token_whitelist=token_whitelist,
        min_transfer_raw=max(min_transfer_raw, 0),
    )


SETTINGS = load_settings()