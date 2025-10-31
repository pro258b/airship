from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Iterable, Optional

from web3 import Web3

from .config import TokenConfig

ERC20_ABI = [
    {
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "inputs": [{"name": "account", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
]


@dataclass
class TokenInventory:
    config: TokenConfig
    raw_balance: int
    human_balance: Decimal
    decimals: int
    symbol: str


class InventoryFetcher:
    def __init__(self, w3: Web3, vault_address: str) -> None:
        self._w3 = w3
        self._vault = Web3.to_checksum_address(vault_address)
        self._metadata_cache: Dict[str, TokenInventory] = {}

    def fetch(self, tokens: Iterable[TokenConfig]) -> Dict[str, TokenInventory]:
        balances: Dict[str, TokenInventory] = {}
        for token in tokens:
            checksum = Web3.to_checksum_address(token.address)
            contract = self._w3.eth.contract(address=checksum, abi=ERC20_ABI)
            raw_balance = contract.functions.balanceOf(self._vault).call()

            inventory = self._metadata_cache.get(checksum.lower())
            if inventory is None:
                decimals = token.decimals
                if decimals is None:
                    decimals = contract.functions.decimals().call()
                symbol = token.symbol
                if symbol is None:
                    try:
                        symbol = contract.functions.symbol().call()
                    except Exception:
                        symbol = "UNKNOWN"
                human_balance = self._to_decimal(raw_balance, decimals)
                inventory = TokenInventory(
                    config=token,
                    raw_balance=raw_balance,
                    human_balance=human_balance,
                    decimals=decimals,
                    symbol=symbol,
                )
                self._metadata_cache[checksum.lower()] = inventory
            else:
                human_balance = self._to_decimal(raw_balance, inventory.decimals)
                inventory = TokenInventory(
                    config=token,
                    raw_balance=raw_balance,
                    human_balance=human_balance,
                    decimals=inventory.decimals,
                    symbol=inventory.symbol,
                )

            balances[checksum.lower()] = inventory
        return balances

    @staticmethod
    def _to_decimal(amount: int, decimals: int) -> Decimal:
        return Decimal(amount) / Decimal(10) ** decimals
