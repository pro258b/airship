# Airship Forta Bot Prototype

Prototype detector + responder that watches ERC-20 `Transfer` events hitting the Airship vault proxy and optionally kicks off the Brownie sweep script when funds arrive.

## Layout

- `agent.py` – Forta detection bot, emits `AIRSHIP-VAULT-TRANSFER` findings when monitored vault addresses receive tokens.
- `config.py` / `config.example.json` – lightweight configuration loader (JSON or env vars).
- `webhook_listener.py` – FastAPI webhook that receives Forta alerts and drives `scripts/transfer_token_from_vault.py`.
- `requirements.txt` – Python dependencies for both the bot and webhook service.

## Configure the Detector

1. Copy `config.example.json` to `config.json` and list vault/token addresses in lowercase (proxy address, not implementation).
2. OR export env vars:
   - `FORTA_VAULT_ADDRESSES=0xvaultA,0xvaultB` (comma-separated)
   - `FORTA_TOKEN_WHITELIST=0xtoken1,0xtoken2` (optional)
   - `FORTA_MIN_TRANSFER_RAW=0` (raw units threshold)

The bot reads `FORTA_BOT_CONFIG` if you want to point at a custom JSON file.

## Run the Bot Locally

```bash
cd deploy_contract/monitoring/forta_bot
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
forta-agent run --file agent.py --trace
```

Set `FORTA_VAULT_ADDRESSES` before launching so the agent knows what to watch. For production deployments follow the [Forta docs](https://docs.forta.network/developers/cli/develop) to publish the bot and subscribe the Airship vault address feed.

## Webhook Autosweep Bridge

`webhook_listener.py` exposes `POST /forta-alert`. When the payload contains `alertId="AIRSHIP-VAULT-TRANSFER"` it can run the existing Brownie script.

Environment variables:

- `AIRSHIP_AUTOSWEEP_ENABLED=true` – enable Brownie execution (defaults to log-only).
- `AIRSHIP_AUTOSWEEP_NETWORK=bsc-main` – forwarded as `--network` for Brownie (optional).
- `AIRSHIP_AUTOSWEEP_SCRIPT=scripts/transfer_token_from_vault.py` – override script path if relocated.
- `AIRSHIP_AUTOSWEEP_OWNER_ENV=DEPLOYER_PRIVATE_KEY` – pass a different env var to the script (`--owner_key_env`).

Start the webhook:

```bash
uvicorn webhook_listener:app --host 0.0.0.0 --port 8000
```

When hooked to Forta, metadata fields (`to`, `token`, `value_raw`) are piped straight into:

```bash
brownie run scripts/transfer_token_from_vault.py \
  --vault_address <vault> --token_address <token> \
  --amount <value_raw> --auto_confirm True [--network ...]
```

## Wiring the Flow

1. Deploy the Forta bot (Forta network or private agent) with your vault/token config.
2. Subscribe the bot alert feed to call your webhook (Forta supports webhooks, Slack, PagerDuty, etc.).
3. Run `webhook_listener.py` alongside Brownie, set `AIRSHIP_AUTOSWEEP_ENABLED=true` once you are ready for automatic sweeps.
4. Alerts will now trigger the sweep script; review Brownie output in the webhook logs.

For safety, keep autosweep disabled in staging, observe alert payloads, then enable automation.