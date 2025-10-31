from __future__ import annotations

import os
from web3 import Web3


def main() -> None:
    rpc_http = os.getenv("MONITOR_RPC_HTTP")
    if not rpc_http:
        raise SystemExit("MONITOR_RPC_HTTP is not set")

    w3 = Web3(Web3.HTTPProvider(rpc_http))
    if not w3.is_connected():
        raise SystemExit("Unable to connect to RPC endpoint")

    block_number = w3.eth.block_number
    print(f"[debug] Latest block: {block_number} (0x{block_number:x})")


def fail():
    w3 = Web3(Web3.HTTPProvider(os.getenv("MONITOR_RPC_HTTP")))
    vault_address = (
        "0xaf88d065e77c8cc2239327c5edb3a432268e5831"  # Replace with your vault address
    )
    from_block = w3.eth.block_number - 5
    to_block = w3.eth.block_number
    transfer_topic = "0x" + Web3.keccak(text="Transfer(address,address,uint256)").hex()
    vault_topic = "0x" + vault_address.lower().replace("0x", "").rjust(64, "0")
    load = {
        "fromBlock": from_block,
        "toBlock": to_block,
        "topics": [transfer_topic, None, vault_topic],
    }
    print(load)
    try:
        logs = w3.eth.get_logs(load)
        print(f"[debug] Logs retrieved: {len(logs)}")
    except Exception as e:
        print(f"[debug] eth_getLogs failed: {e}")


if __name__ == "__main__":
    main()
    fail()
