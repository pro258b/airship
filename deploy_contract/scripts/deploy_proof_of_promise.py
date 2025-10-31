"""
Oracle address (PROOF_PROMISE_ORACLE): pick the account that will attest promise completion when the counterparty can’t
 sign. This could be a dedicated signer you control, a multisig, or leave it empty (0x000...000) if you don’t need oracle
 attestations yet.
 - Treasury address (PROOF_PROMISE_TREASURY): where donated funds should land when a promise breaches with the “Donate”
 policy. Use a wallet, company treasury, or charity address you control. If unset it defaults to the zero address, which
 blocks the donate policy.

 To obtain them, use the public address of any existing wallet (MetaMask, hardware wallet, multisig). If you need a fresh
 one, Brownie can generate it (brownie accounts new <name> → get account.address) or you can create a new wallet in your
 preferred tool.
"""

import os
from typing import Optional

from brownie import (
    ProofOfPromise,
    ProofOfPromiseProxy,
    Contract,
    accounts,
    network,
)

ENV_DEPLOYER_KEY = "DEPLOYER_PRIVATE_KEY"
ENV_PROXY_ADMIN = "PROOF_PROMISE_PROXY_ADMIN"
ENV_ORACLE = "PROOF_PROMISE_ORACLE"
ENV_TREASURY = "PROOF_PROMISE_TREASURY"
ENV_DEFAULT_DELAY = "PROOF_PROMISE_DEFAULT_DELAY"
ENV_MAX_DELAY = "PROOF_PROMISE_MAX_DELAY"


def _get_env(name: str, required: bool = True) -> Optional[str]:
    value = os.environ.get(name)
    if required and not value:
        raise EnvironmentError(f"Environment variable {name} is required")
    return value


def _load_deployer():
    private_key = _get_env(ENV_DEPLOYER_KEY)
    return accounts.add(private_key)


def _resolve_delay(value: Optional[str], fallback: int) -> int:
    if value is None:
        return fallback
    parsed = int(value)
    if parsed <= 0:
        raise ValueError("Delay must be positive")
    return parsed


def main(
    admin: Optional[str] = None,
    oracle: Optional[str] = None,
    treasury: Optional[str] = None,
    default_delay: Optional[int] = None,
    max_delay: Optional[int] = None,
):
    deployer = _load_deployer()
    active_network = network.show_active()
    print(f"Deploying ProofOfPromise to {active_network} from {deployer.address}")

    proxy_admin = admin or _get_env(ENV_PROXY_ADMIN, required=False) or deployer.address
    oracle_addr = (
        oracle
        or _get_env(ENV_ORACLE, required=False)
        or "0x0000000000000000000000000000000000000000"
    )
    treasury_addr = (
        treasury
        or _get_env(ENV_TREASURY, required=False)
        or "0x0000000000000000000000000000000000000000"
    )

    default_delay_seconds = _resolve_delay(
        str(default_delay)
        if default_delay is not None
        else _get_env(ENV_DEFAULT_DELAY, required=False),
        5 * 365 * 24 * 60 * 60,
    )
    max_delay_seconds = _resolve_delay(
        str(max_delay)
        if max_delay is not None
        else _get_env(ENV_MAX_DELAY, required=False),
        default_delay_seconds,
    )

    implementation = ProofOfPromise.deploy({"from": deployer})
    initializer = implementation.initialize.encode_input(
        proxy_admin,
        oracle_addr,
        treasury_addr,
        default_delay_seconds,
        max_delay_seconds,
    )

    proxy = ProofOfPromiseProxy.deploy(
        implementation.address,
        proxy_admin,
        initializer,
        {"from": deployer},
    )

    proxied_contract = Contract.from_abi(
        "ProofOfPromise", proxy.address, ProofOfPromise.abi
    )

    print("Implementation:", implementation.address)
    print("Proxy:", proxy.address)
    print("Proxy admin:", proxy_admin)
    print("Oracle:", oracle_addr)
    print("Treasury:", treasury_addr)
    print("Default delay:", default_delay_seconds)
    print("Max delay:", max_delay_seconds)

    return proxied_contract
