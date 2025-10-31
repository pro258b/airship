from __future__ import annotations

import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Optional

from web3 import Web3

from .config import MonitorConfig, PoolConfig
from .inventory import ERC20_ABI
from .strategy import StrategyDecision


UNISWAP_V3_ROUTER_ABI = [
    {
        "name": "exactInputSingle",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "inputs": [
            {
                "name": "params",
                "type": "tuple",
                "components": [
                    {"name": "tokenIn", "type": "address"},
                    {"name": "tokenOut", "type": "address"},
                    {"name": "fee", "type": "uint24"},
                    {"name": "recipient", "type": "address"},
                    {"name": "deadline", "type": "uint256"},
                    {"name": "amountIn", "type": "uint256"},
                    {"name": "amountOutMinimum", "type": "uint256"},
                    {"name": "sqrtPriceLimitX96", "type": "uint160"},
                ],
            }
        ],
        "stateMutability": "payable",
        "type": "function",
    }
]

UNISWAP_V2_ROUTER_ABI = [
    {
        "name": "swapExactTokensForTokens",
        "outputs": [{"name": "amounts", "type": "uint256[]"}],
        "inputs": [
            {"name": "amountIn", "type": "uint256"},
            {"name": "amountOutMin", "type": "uint256"},
            {"name": "path", "type": "address[]"},
            {"name": "to", "type": "address"},
            {"name": "deadline", "type": "uint256"},
        ],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

AIRSHIP_VAULT_ABI = [
    {
        "name": "swapTokens",
        "inputs": [
            {"name": "dex", "type": "address"},
            {"name": "tokenIn", "type": "address"},
            {"name": "tokenOut", "type": "address"},
            {"name": "amountIn", "type": "uint256"},
            {"name": "minAmountOut", "type": "uint256"},
            {"name": "recipient", "type": "address"},
            {"name": "data", "type": "bytes"},
        ],
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


@dataclass
class AdapterCall:
    dex: str
    payload: bytes


@dataclass
class SwapExecution:
    dex: str
    token_in: str
    token_out: str
    amount_in: int
    min_amount_out: int
    recipient: str
    payload: bytes


class DexAdapter:
    def __init__(self, w3: Web3, pool: PoolConfig, config: MonitorConfig) -> None:
        self.w3 = w3
        self.pool = pool
        self.config = config

    def build(self, decision: StrategyDecision, min_amount_out: int, timestamp: int) -> AdapterCall:
        raise NotImplementedError


class UniswapV3Adapter(DexAdapter):
    def __init__(self, w3: Web3, pool: PoolConfig, config: MonitorConfig) -> None:
        super().__init__(w3, pool, config)
        router_address = pool.metadata.get("router") if pool.metadata else None
        if router_address is None:
            raise ValueError("Uniswap V3 adapter requires router address in metadata")
        self.router = Web3.to_checksum_address(router_address)
        self.contract = w3.eth.contract(address=self.router, abi=UNISWAP_V3_ROUTER_ABI)

    def build(self, decision: StrategyDecision, min_amount_out: int, timestamp: int) -> AdapterCall:
        if self.pool.fee is None:
            raise ValueError("Pool fee required for Uniswap V3 swaps")
        deadline_buffer = int(self.pool.metadata.get("deadline_buffer", 600)) if self.pool.metadata else 600
        router_recipient = (
            self.pool.metadata.get("router_recipient") if self.pool.metadata else None
        )
        recipient = Web3.to_checksum_address(router_recipient or self.config.vault_address)
        params = (
            Web3.to_checksum_address(decision.token_inventory.config.address),
            Web3.to_checksum_address(self.pool.quote_token),
            int(self.pool.fee),
            recipient,
            int(timestamp + deadline_buffer),
            int(decision.sell_amount),
            int(min_amount_out),
            0,
        )
        payload = self.contract.encodeABI(fn_name="exactInputSingle", args=[params])
        return AdapterCall(dex=self.router, payload=bytes.fromhex(payload[2:]))


class UniswapV2Adapter(DexAdapter):
    def __init__(self, w3: Web3, pool: PoolConfig, config: MonitorConfig) -> None:
        super().__init__(w3, pool, config)
        router_address = pool.metadata.get("router") if pool.metadata else None
        if router_address is None:
            raise ValueError("Uniswap V2 adapter requires router address in metadata")
        self.router = Web3.to_checksum_address(router_address)
        self.contract = w3.eth.contract(address=self.router, abi=UNISWAP_V2_ROUTER_ABI)

    def build(self, decision: StrategyDecision, min_amount_out: int, timestamp: int) -> AdapterCall:
        path = self.pool.metadata.get("path") if self.pool.metadata else None
        if not path:
            raise ValueError("Uniswap V2 adapter requires swap path in metadata")
        checksum_path = [Web3.to_checksum_address(addr) for addr in path]
        deadline_buffer = int(self.pool.metadata.get("deadline_buffer", 600))
        recipient = Web3.to_checksum_address(self.config.vault_address)
        payload = self.contract.encodeABI(
            fn_name="swapExactTokensForTokens",
            args=[
                int(decision.sell_amount),
                int(min_amount_out),
                checksum_path,
                recipient,
                int(timestamp + deadline_buffer),
            ],
        )
        return AdapterCall(dex=self.router, payload=bytes.fromhex(payload[2:]))


class SwapExecutor:
    def __init__(self, w3: Web3, config: MonitorConfig) -> None:
        self._w3 = w3
        self._config = config
        self._decimals_cache: Dict[str, int] = {}
        self._vault_contract = w3.eth.contract(
            address=Web3.to_checksum_address(config.vault_address),
            abi=AIRSHIP_VAULT_ABI,
        )

    def build_execution(
        self,
        decision: StrategyDecision,
        pool: PoolConfig,
        price: Decimal,
        timestamp: Optional[int] = None,
    ) -> SwapExecution:
        if timestamp is None:
            timestamp = int(time.time())

        token_in_address = Web3.to_checksum_address(decision.token_inventory.config.address)
        token_out_address = Web3.to_checksum_address(pool.quote_token)

        quote_decimals = self._get_decimals(token_out_address)
        base_decimals = decision.token_inventory.decimals

        amount_in_decimal = Decimal(decision.sell_amount) / Decimal(10) ** base_decimals
        expected_out_decimal = amount_in_decimal * price
        slippage_factor = Decimal(1) - Decimal(decision.slippage_bps) / Decimal(10_000)
        min_out_decimal = expected_out_decimal * slippage_factor
        min_out = int(min_out_decimal * Decimal(10) ** quote_decimals)
        if min_out <= 0:
            min_out = 1

        adapter = self._select_adapter(pool)
        adapter_call = adapter.build(decision, min_out, timestamp)

        recipient = self._resolve_recipient(pool)

        return SwapExecution(
            dex=adapter_call.dex,
            token_in=token_in_address,
            token_out=token_out_address,
            amount_in=int(decision.sell_amount),
            min_amount_out=min_out,
            recipient=recipient,
            payload=adapter_call.payload,
        )

    def build_vault_tx(self, execution: SwapExecution, sender: str) -> Dict[str, object]:
        data = self._vault_contract.encodeABI(
            fn_name="swapTokens",
            args=[
                execution.dex,
                execution.token_in,
                execution.token_out,
                execution.amount_in,
                execution.min_amount_out,
                execution.recipient,
                execution.payload,
            ],
        )
        tx = {
            "to": self._vault_contract.address,
            "data": data,
            "from": Web3.to_checksum_address(sender),
            "value": 0,
        }
        return tx

    def _select_adapter(self, pool: PoolConfig) -> DexAdapter:
        pool_type = pool.type.lower()
        if pool_type in {"uniswap_v3", "univ3"}:
            return UniswapV3Adapter(self._w3, pool, self._config)
        if pool_type in {"uniswap_v2", "univ2", "sushiswap"}:
            return UniswapV2Adapter(self._w3, pool, self._config)
        raise ValueError(f"Unsupported adapter type: {pool.type}")

    def _get_decimals(self, token_address: str) -> int:
        key = token_address.lower()
        if key not in self._decimals_cache:
            contract = self._w3.eth.contract(
                address=Web3.to_checksum_address(token_address),
                abi=ERC20_ABI,
            )
            decimals = contract.functions.decimals().call()
            self._decimals_cache[key] = int(decimals)
        return self._decimals_cache[key]

    def _resolve_recipient(self, pool: PoolConfig) -> str:
        if pool.metadata and pool.metadata.get("recipient"):
            return Web3.to_checksum_address(pool.metadata["recipient"])
        return Web3.to_checksum_address(self._config.executor_address)
