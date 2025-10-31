forta-agent init is run @ deploy_contract/monitoring/forta-bot/default_init

Forta Monitor

  - Added a Forta detector in deploy_contract/monitoring/forta_bot/agent.py:1 that reloads settings, watches ERC‑20
  Transfer logs, and raises an AIRSHIP-VAULT-TRANSFER alert whenever a monitored vault address receives tokens
  (optional whitelist + min amount in config.py:1 / config.example.json:1).
  - Built a FastAPI autosweep bridge in deploy_contract/monitoring/forta_bot/webhook_listener.py:1; incoming Forta
  alerts can either be logged or, when AIRSHIP_AUTOSWEEP_ENABLED=true, run scripts/transfer_token_from_vault.py
  with the vault/token/value metadata and your chosen Brownie network/key env.
  - Documented setup and runtime flow in deploy_contract/monitoring/forta_bot/README.md:1, including dependency
  install (requirements.txt:1), config env vars, Forta CLI commands, and how the webhook ties back into the
  existing sweep script.

  Next up:

  1. Populate config.json (or env vars) with your vault proxy and token list, then dry-run forta-agent run --file
  agent.py.
  2. Launch the webhook (uvicorn webhook_listener:app --port 8000), confirm alerts reach it with autosweep
  disabled, and only then flip AIRSHIP_AUTOSWEEP_ENABLED=true for live sweeps.xxx`