from __future__ import annotations

import os
from web3 import Web3


def main() -> None:
    rpc_http = os.getenv('MONITOR_RPC_HTTP')
    if not rpc_http:
        raise SystemExit('MONITOR_RPC_HTTP is not set')

    w3 = Web3(Web3.HTTPProvider(rpc_http))
    if not w3.is_connected():
        raise SystemExit('Unable to connect to RPC endpoint')

    block_number = w3.eth.block_number
    print(f'Connected: block {block_number}')


if __name__ == '__main__':
    main()
