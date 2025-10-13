from typing import List

from forta_agent import Finding, FindingSeverity, FindingType, TransactionEvent

from .config import SETTINGS, load_settings
from .constants import TRANSFER_EVENT_ABI

CURRENT_SETTINGS = SETTINGS


def initialize():
    global CURRENT_SETTINGS
    CURRENT_SETTINGS = load_settings()


def _build_finding(event, tx_event: TransactionEvent) -> Finding:
    value_raw = int(event["args"]["value"])
    from_address = event["args"]["from"].lower()
    to_address = event["args"]["to"].lower()
    token_address = event["address"].lower()

    description = (
        f"Transfer of {value_raw} units from {from_address} to vault {to_address}"
    )

    return Finding(
        {
            "name": "Vault Token Deposit",
            "description": description,
            "alert_id": "AIRSHIP-VAULT-TRANSFER",
            "type": FindingType.Info,
            "severity": FindingSeverity.Info,
            "metadata": {
                "tx_hash": tx_event.hash,
                "token": token_address,
                "from": from_address,
                "to": to_address,
                "value_raw": str(value_raw),
                "block_number": str(tx_event.block_number),
            },
        }
    )


def handle_transaction(tx_event: TransactionEvent) -> List[Finding]:
    findings: List[Finding] = []
    settings = CURRENT_SETTINGS

    if not settings.vault_addresses:
        return findings

    transfer_events = tx_event.filter_log(TRANSFER_EVENT_ABI)

    for event in transfer_events:
        token_address = event["address"].lower()
        if settings.token_whitelist and token_address not in settings.token_whitelist:
            continue

        recipient = event["args"]["to"].lower()
        if recipient not in settings.vault_addresses:
            continue

        raw_value = int(event["args"]["value"])
        if raw_value < settings.min_transfer_raw:
            continue

        findings.append(_build_finding(event, tx_event))

    return findings