import os
from typing import Optional

from brownie import AirshipVaultToken, Contract, accounts, network
from brownie.network.account import LocalAccount

ENV_OWNER_KEY = "DEPLOYER_PRIVATE_KEY"
ENV_FALLBACK_RECIPIENT = "VAULT_SWEEP_RECIPIENT"


def _load_owner(env_key: str) -> LocalAccount:
    try:
        private_key = os.environ[env_key]
    except KeyError as exc:
        raise EnvironmentError(
            f"Environment variable {env_key} is required to sign the sweep transaction"
        ) from exc
    return accounts.add(private_key)


def _normalise_amount(raw_amount) -> int:
    if isinstance(raw_amount, int):
        return raw_amount
    if isinstance(raw_amount, str):
        cleaned = raw_amount.replace("_", "").strip()
        base = 16 if cleaned.lower().startswith("0x") else 10
        return int(cleaned, base)
    raise TypeError("amount must be an int or string")


def _is_truthy(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "y", "yes"}
    return bool(value)


def main(
    vault_address: str = os.environ.get("MONITOR_VAULT_ADDRESS"),
    #token_address: str= os.environ.get("MONITOR_TOKEN_ADDRESS"),
    #amount=0,
    #recipient: Optional[str] = "0x0163dC76117F99cde3845d17430Fc0ef5EFa4920",
    owner_key_env: str = ENV_OWNER_KEY,
    auto_confirm=False,
):
    owner = _load_owner(owner_key_env)
    token_address = input('token_address:')
    destination = input('recipient:') or os.environ.get(ENV_FALLBACK_RECIPIENT) or owner.address
    transfer_amount = _normalise_amount(input('amount:'))

    vault = Contract.from_abi("AirshipVaultToken", vault_address, AirshipVaultToken.abi)
    vault_owner = vault.owner()

    if vault_owner.lower() != owner.address.lower():
        raise PermissionError(
            f"Loaded account {owner.address} is not the vault owner ({vault_owner})"
        )

    active_network = network.show_active()
    print(f"Network: {active_network}")
    print(f"Vault: {vault_address}")
    print(f"Token: {token_address}")
    print(f"Recipient: {destination}")
    print(f"Amount (raw units): {transfer_amount}")

    if not _is_truthy(auto_confirm):
        proceed = input("Proceed with sweep? [y/N]: ").strip().lower()
        if proceed not in {"y", "yes"}:
            print("Aborting sweep.")
            return None

    tx = vault.sweepToken(token_address, destination, transfer_amount, {"from": owner})
    tx.wait(1)
    print(f"Sweep complete. Tx hash: {tx.txid}")

    return tx