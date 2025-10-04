import os
from typing import Optional

from brownie import AirshipVaultToken, AirshipProxy, Contract, accounts, network

ENV_KEY = "DEPLOYER_PRIVATE_KEY"
ENV_OWNER = "DEPLOY_OWNER_ADDRESS"


def _load_deployer():
    try:
        private_key = os.environ[ENV_KEY]
    except KeyError as exc:
        raise EnvironmentError(f"Environment variable {ENV_KEY} is required to deploy") from exc

    account = accounts.add(private_key)
    return account


def _resolve_owner(requested_owner: Optional[str], deployer_address: str) -> str:
    if requested_owner:
        return requested_owner
    return os.environ.get(ENV_OWNER, deployer_address)


def main(name: str = "Airship Vault Token", symbol: str = "AVT", owner: Optional[str] = None):
    deployer = _load_deployer()
    active_network = network.show_active()
    print(f"Deploying AirshipVaultToken to {active_network} from {deployer.address}")

    implementation = AirshipVaultToken.deploy({"from": deployer})
    owner_address = _resolve_owner(owner, deployer.address)
    initializer = implementation.initialize.encode_input(name, symbol, owner_address)

    proxy = AirshipProxy.deploy(implementation.address, initializer, {"from": deployer})
    proxied_token = Contract.from_abi("AirshipVaultToken", proxy.address, AirshipVaultToken.abi)

    print("Implementation:", implementation.address)
    print("Proxy:", proxy.address)
    print("Owner:", owner_address)

    return proxied_token
