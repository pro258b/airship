# just test config.json is populated correctly

import os, json
from pathlib import Path

CONFIG_PATH = Path("deploy_contract/monitoring/config.json")
TOKEN_ENV = os.getenv(
    "TOKEN_PLACEHOLDER", "MONITOR_TOKEN_ADDRESS"
)  # or whatever token placeholder you exported
config = json.loads(CONFIG_PATH.read_text())
pools_for_token = []
for token in config.get("tokens", []):
    # token["address"] still contains the placeholder (e.g. "$MONITOR_TOKEN_ADDRESS")
    placeholder = token.get("address", "")
    if placeholder.strip("$ {}") == TOKEN_ENV:
        for pool in token.get("pools", []):
            pools_for_token.append(
                {
                    "pool_env": pool["address"].strip("$ {}"),
                    "base_env": pool["base_token"].strip("$ {}"),
                    "quote_env": pool["quote_token"].strip("$ {}"),
                    "metadata": pool.get("metadata", {}),
                }
            )
print(pools_for_token)
