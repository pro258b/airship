from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

from web3 import Web3

from .quote_sets import QuoteCandidate

_UNISWAP_V2_FACTORY_ABI = [
    {
        'name': 'getPair',
        'type': 'function',
        'inputs': [
            {'name': 'tokenA', 'type': 'address'},
            {'name': 'tokenB', 'type': 'address'},
        ],
        'outputs': [{'name': 'pair', 'type': 'address'}],
        'stateMutability': 'view',
    }
]

_UNISWAP_V2_PAIR_ABI = [
    {
        'name': 'getReserves',
        'type': 'function',
        'inputs': [],
        'outputs': [
            {'name': 'reserve0', 'type': 'uint112'},
            {'name': 'reserve1', 'type': 'uint112'},
            {'name': 'blockTimestampLast', 'type': 'uint32'},
        ],
        'stateMutability': 'view',
    },
    {
        'name': 'token0',
        'type': 'function',
        'inputs': [],
        'outputs': [{'name': '', 'type': 'address'}],
        'stateMutability': 'view',
    },
    {
        'name': 'token1',
        'type': 'function',
        'inputs': [],
        'outputs': [{'name': '', 'type': 'address'}],
        'stateMutability': 'view',
    },
]


@dataclass
class V2Pool:
    pool_address: str
    quote: QuoteCandidate
    reserve_token: int
    reserve_quote: int
    token0: str
    token1: str


def find_uniswap_v2_pools(
    w3: Web3,
    factory_address: str,
    token_address: str,
    quote_candidates: Iterable[QuoteCandidate],
    *,
    min_token_reserve: int = 0,
) -> List[V2Pool]:
    factory = w3.eth.contract(address=Web3.to_checksum_address(factory_address), abi=_UNISWAP_V2_FACTORY_ABI)
    token_checksum = Web3.to_checksum_address(token_address)
    pools: List[V2Pool] = []

    for quote in quote_candidates:
        pair_address = factory.functions.getPair(token_checksum, quote.address).call()
        if int(pair_address, 16) == 0:
            continue
        pair_checksum = Web3.to_checksum_address(pair_address)
        pair_contract = w3.eth.contract(address=pair_checksum, abi=_UNISWAP_V2_PAIR_ABI)

        try:
            reserves = pair_contract.functions.getReserves().call()
            token0 = Web3.to_checksum_address(pair_contract.functions.token0().call())
            token1 = Web3.to_checksum_address(pair_contract.functions.token1().call())
        except Exception:  # pragma: no cover - on-chain failure
            continue

        if token0.lower() == token_checksum.lower():
            reserve_token = reserves[0]
            reserve_quote = reserves[1]
        else:
            reserve_token = reserves[1]
            reserve_quote = reserves[0]

        if reserve_token < min_token_reserve:
            continue

        pools.append(
            V2Pool(
                pool_address=pair_checksum,
                quote=quote,
                reserve_token=reserve_token,
                reserve_quote=reserve_quote,
                token0=token0,
                token1=token1,
            )
        )

    return pools
