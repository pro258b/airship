from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

from web3 import Web3

from .quote_sets import QuoteCandidate

_UNISWAP_V3_FACTORY_ABI = [
    {
        'name': 'getPool',
        'type': 'function',
        'inputs': [
            {'name': 'tokenA', 'type': 'address'},
            {'name': 'tokenB', 'type': 'address'},
            {'name': 'fee', 'type': 'uint24'},
        ],
        'outputs': [{'name': 'pool', 'type': 'address'}],
        'stateMutability': 'view',
    }
]

_UNISWAP_V3_POOL_ABI = [
    {
        'name': 'slot0',
        'type': 'function',
        'inputs': [],
        'outputs': [
            {'name': 'sqrtPriceX96', 'type': 'uint160'},
            {'name': 'tick', 'type': 'int24'},
            {'name': 'observationIndex', 'type': 'uint16'},
            {'name': 'observationCardinality', 'type': 'uint16'},
            {'name': 'observationCardinalityNext', 'type': 'uint16'},
            {'name': 'feeProtocol', 'type': 'uint8'},
            {'name': 'unlocked', 'type': 'bool'},
        ],
        'stateMutability': 'view',
    },
    {
        'name': 'liquidity',
        'type': 'function',
        'inputs': [],
        'outputs': [{'name': '', 'type': 'uint128'}],
        'stateMutability': 'view',
    },
]


@dataclass
class V3Pool:
    pool_address: str
    quote: QuoteCandidate
    fee: int
    liquidity: int


def find_uniswap_v3_pools(
    w3: Web3,
    factory_address: str,
    token_address: str,
    quote_candidates: Iterable[QuoteCandidate],
    fee_tiers: Iterable[int],
    *,
    min_liquidity: int = 0,
) -> List[V3Pool]:
    factory = w3.eth.contract(address=Web3.to_checksum_address(factory_address), abi=_UNISWAP_V3_FACTORY_ABI)
    token_checksum = Web3.to_checksum_address(token_address)
    pools: List[V3Pool] = []

    for quote in quote_candidates:
        for fee in fee_tiers:
            pool_address = factory.functions.getPool(token_checksum, quote.address, int(fee)).call()
            if int(pool_address, 16) == 0:
                continue
            pool_checksum = Web3.to_checksum_address(pool_address)
            pool_contract = w3.eth.contract(address=pool_checksum, abi=_UNISWAP_V3_POOL_ABI)
            try:
                slot0 = pool_contract.functions.slot0().call()
                liquidity = pool_contract.functions.liquidity().call()
            except Exception:  # pragma: no cover - on-chain failure
                continue
            if liquidity < min_liquidity:
                continue
            if slot0[0] == 0:
                continue
            pools.append(
                V3Pool(
                    pool_address=pool_checksum,
                    quote=quote,
                    fee=int(fee),
                    liquidity=liquidity,
                )
            )

    return pools
