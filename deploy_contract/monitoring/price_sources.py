from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, getcontext
from typing import Optional

from web3 import Web3

from .config import PoolConfig

getcontext().prec = 60


UNISWAP_V2_PAIR_ABI = [
    {
        "name": "getReserves",
        "outputs": [
            {"name": "_reserve0", "type": "uint112"},
            {"name": "_reserve1", "type": "uint112"},
            {"name": "_blockTimestampLast", "type": "uint32"},
        ],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "name": "token0",
        "outputs": [{"name": "", "type": "address"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "name": "token1",
        "outputs": [{"name": "", "type": "address"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
]

UNISWAP_V3_POOL_ABI = [
    {
        "name": "slot0",
        "outputs": [
            {"name": "sqrtPriceX96", "type": "uint160"},
            {"name": "tick", "type": "int24"},
            {"name": "observationIndex", "type": "uint16"},
            {"name": "observationCardinality", "type": "uint16"},
            {"name": "observationCardinalityNext", "type": "uint16"},
            {"name": "feeProtocol", "type": "uint8"},
            {"name": "unlocked", "type": "bool"},
        ],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "name": "observe",
        "outputs": [
            {"name": "tickCumulatives", "type": "int56[]"},
            {"name": "secondsPerLiquidityCumulatives", "type": "uint160[]"},
        ],
        "inputs": [{"name": "secondsAgos", "type": "uint32[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "name": "token0",
        "outputs": [{"name": "", "type": "address"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "name": "token1",
        "outputs": [{"name": "", "type": "address"}],
        "inputs": [],
        "stateMutability": "view",
        "type": "function",
    },
]


@dataclass
class PriceResult:
    price: Decimal
    tick: Optional[int]


class BasePriceSource:
    def __init__(self, pool: PoolConfig) -> None:
        self.pool = pool
        self._address = Web3.to_checksum_address(pool.address)

    def fetch(self, w3: Web3, base_decimals: int, quote_decimals: int) -> PriceResult:
        raise NotImplementedError


class UniswapV2PriceSource(BasePriceSource):
    def fetch(self, w3: Web3, base_decimals: int, quote_decimals: int) -> PriceResult:
        contract = w3.eth.contract(address=self._address, abi=UNISWAP_V2_PAIR_ABI)
        reserve0, reserve1, _ = contract.functions.getReserves().call()
        token0 = Web3.to_checksum_address(contract.functions.token0().call())
        token1 = Web3.to_checksum_address(contract.functions.token1().call())

        reserve0_dec = Decimal(reserve0)
        reserve1_dec = Decimal(reserve1)

        scale = Decimal(10) ** (base_decimals - quote_decimals)

        if token0.lower() == self.pool.base_token.lower():
            ratio = reserve1_dec / reserve0_dec
            price = ratio * scale
        elif token1.lower() == self.pool.base_token.lower():
            ratio = reserve0_dec / reserve1_dec
            price = ratio * scale
        else:  # pragma: no cover - configuration error
            raise ValueError("Base token does not match pool tokens")

        return PriceResult(price=price, tick=None)


class UniswapV3PriceSource(BasePriceSource):
    def fetch(self, w3: Web3, base_decimals: int, quote_decimals: int) -> PriceResult:
        contract = w3.eth.contract(address=self._address, abi=UNISWAP_V3_POOL_ABI)
        token0 = Web3.to_checksum_address(contract.functions.token0().call())
        token1 = Web3.to_checksum_address(contract.functions.token1().call())

        tick: Optional[int] = None
        price: Optional[Decimal] = None

        use_twap = self.pool.twap_seconds and self.pool.twap_seconds > 0

        if use_twap:
            try:
                seconds = int(self.pool.twap_seconds)
                tick_cumulatives, _ = contract.functions.observe([seconds, 0]).call()
                tick_delta = tick_cumulatives[1] - tick_cumulatives[0]
                average_tick = Decimal(tick_delta) / Decimal(seconds)
                tick = int(average_tick.to_integral_value(rounding="ROUND_HALF_EVEN"))
                price = self._price_from_tick(average_tick, token0, token1, base_decimals, quote_decimals)
            except Exception:  # pragma: no cover - fallback to spot
                price = None
                tick = None

        if price is None:
            slot0 = contract.functions.slot0().call()
            sqrt_price_x96 = slot0[0]
            tick = slot0[1]
            price = self._price_from_sqrt_price(
                sqrt_price_x96,
                token0,
                token1,
                base_decimals,
                quote_decimals,
            )

        return PriceResult(price=price, tick=tick)

    def _price_from_sqrt_price(
        self,
        sqrt_price_x96: int,
        token0: str,
        token1: str,
        base_decimals: int,
        quote_decimals: int,
    ) -> Decimal:
        ratio = Decimal(sqrt_price_x96) * Decimal(sqrt_price_x96) / Decimal(1 << 192)
        scale = Decimal(10) ** (base_decimals - quote_decimals)
        if token0.lower() == self.pool.base_token.lower():
            return ratio * scale
        elif token1.lower() == self.pool.base_token.lower():
            return (Decimal(1) / ratio) * scale
        raise ValueError("Base token does not match pool tokens")  # pragma: no cover

    def _price_from_tick(
        self,
        tick: Decimal,
        token0: str,
        token1: str,
        base_decimals: int,
        quote_decimals: int,
    ) -> Decimal:
        ratio = Decimal("1.0001") ** tick
        scale = Decimal(10) ** (base_decimals - quote_decimals)
        if token0.lower() == self.pool.base_token.lower():
            return ratio * scale
        elif token1.lower() == self.pool.base_token.lower():
            return (Decimal(1) / ratio) * scale
        raise ValueError("Base token does not match pool tokens")  # pragma: no cover


def build_price_source(pool: PoolConfig) -> BasePriceSource:
    pool_type = pool.type.lower()
    if pool_type in {"uniswap_v2", "univ2", "sushiswap"}:
        return UniswapV2PriceSource(pool)
    if pool_type in {"uniswap_v3", "univ3"}:
        return UniswapV3PriceSource(pool)
    raise ValueError(f"Unsupported pool type: {pool.type}")
