Airship Monitoring MVP
======================

This package wires up a monitoring loop that tracks vault-held tokens, compares price movements against configured thresholds, and prepares swap transactions when targets are met.

Components
----------
- config.py and config.example.json define vault/executor addresses, tracked tokens, pools, and strategy knobs.
- service.py coordinates Web3 connections, balances, pricing, discovery, and strategy execution.
- price_sources.py computes Uniswap v2/v3 spot or TWAP prices.
- strategy.py handles baselines, cooldowns, and the 50% sell trigger with optional persistence.
- executor.py turns decisions into encoded AirshipVaultToken.swapTokens calls via pluggable DEX adapters.
- token_discovery.py scans for new ERC-20 deposits into the vault and appends skeleton entries to the config file.

Usage
-----
1. Copy config.example.json to a writable file (for example monitoring/config.json). Replace each `$ENV_VAR` placeholder with the environment variable name you will export (no literal addresses or URLs should live in the file).
2. Export the referenced variables before running, e.g. `export MONITOR_RPC_HTTP=https://...`.
3. Optionally set state_file for baseline persistence.
4. Run the monitor (auto discovery shown but optional):
   import asyncio
   from monitoring.service import load_service_from_file

   monitor = load_service_from_file(
       "monitoring/config.json",
       auto_discover=True,
       discovery_lookback=10_000,
  )
  asyncio.run(monitor.run_forever(interval_seconds=120))
5. Each cycle logs HOLD/SELL decisions and, when triggered, prepares a SwapExecution that can be submitted with SwapExecutor.build_vault_tx.

Environment Variables
---------------------
Required placeholders are defined in `config.example.json`. Typical exports include:

- Core: `MONITOR_RPC_HTTP`, `MONITOR_RPC_WS` (optional), `MONITOR_VAULT_ADDRESS`, `MONITOR_EXECUTOR_ADDRESS`.
- Quote universe: `MONITOR_QUOTE_CANDIDATES` (e.g. `['$TOKEN_USDC','$TOKEN_USDT','$TOKEN_WETH']`) and the referenced quote vars (`TOKEN_USDC`, `TOKEN_USDT`, ...).
- Uniswap plumbing: `UNIV2_FACTORY`, `UNIV3_FACTORY`, `UNIV2_ROUTER`, `UNIV3_ROUTER`, `UNIV3_FEE_TIERS` (JSON or comma list).
- Monitoring defaults: any generated placeholders printed by the discovery logs (for new tokens or pools).

Token Discovery
---------------
- Automatic discovery (auto_discover=True) tails recent blocks for Transfer events into the vault, proposes environment variable names for fresh tokens, and reloads the service so they are tracked on the next pass. Set the printed variables in your shell or secrets manager to make the entries persistent.
- Manual discovery is available via token_discovery.discover_new_tokens if you need to backfill historical ranges or script custom workflows.

Pool Lookup
-----------
- Use `from monitoring.pool_lookup import find_pools` to query Uniswap v2/v3 factories for a given token. The helper returns pool addresses plus suggested env var names and metadata dictionaries ready to drop into the config.
- The discovery loop invokes this automatically for new tokens so you only need to export the printed pool variables.

Extending
---------
- Register new DEX adapters by subclassing DexAdapter in executor.py.
- Add alternative price feeds by extending price_sources.build_price_source.
- Integrate with job runners by consuming the EvaluationContext objects returned from run_once().



  Runner

  - The launcher script points at config.json, wraps load_service_from_file, and surfaces missing env vars as a
  friendly exit message (deploy_contract/monitoring/run.py:9).

  What to do

  1. Copy deploy_contract/monitoring/config.example.json to config.json and leave only $ENV placeholders.
  2. Export every referenced variable before running, e.g.
     set MONITOR_RPC_HTTP=https://... (Windows) or
     export MONITOR_RPC_HTTP=https://... (bash).
  3. Run python -m deploy_contract.monitoring.run; keep an eye on the log for new token discovered messages, then
  add those env vars to your shell/secrets manager to make them permanent.

  ### 3. Workflow

  1. Export environment variables:

     export MONITOR_RPC_HTTP=https://mainnet.infura.io/v3/...
     export MONITOR_QUOTE_CANDIDATES='["$TOKEN_USDC","$TOKEN_USDT","$TOKEN_WETH"]'
     export TOKEN_USDC=0xA0b869...
     export TOKEN_USDT=0xdAC17...
     export TOKEN_WETH=0xC02aa...
     export UNIV2_FACTORY=0x5C69...
     export UNIV3_FACTORY=0x1F98...
     export UNIV3_FEE_TIERS='[500,3000,10000]'
  2. Call find_pools("<your token>").
  3. The service returns a list of candidate pools with their quote token placeholders.
  4. The monitor-specific code can then pick the deepest pool (e.g. highest liquidity) and write those placeholders
  straight into config.json.

  ———

  ### 4. Optional Enhancements

  - Liquidity Ranking: For v2, grab reserves; for v3, compute liquidity or pull observe to get volume.
  - Subgraph Backfill: If you prefer offloading to The Graph, add a graphql_sources.py module reading env var
  $UNISWAP_SUBGRAPH_URL.
  - Multi-chain: Parameterise factory addresses/quote sets per chain ID (derive from w3.eth.chain_id).

  ———

  ### 5. Integration with Discovery

  Once find_pools exposes {pool_env, quote_env}, your discovery loop can:

  1. Call find_pools after a new token arrives.
  2. Populate each token’s pools entry with:

     {
       "type": "uniswap_v3",
       "address": "$MONITOR_POOL_ADDRESS",
       "base_token": "$MONITOR_TOKEN_ADDRESS",
       "quote_token": "$TOKEN_USDC",
       "fee": 3000,
       "metadata": {...}
     }
  3. Print instructions telling the operator which env vars to set (MONITOR_POOL_ADDRESS, etc.).
  4. Persist the placeholders in config.json—actual values stay in the environment.

  This design keeps everything environment-driven, avoids hardcoding addresses, and reuses the existing monitoring
  infrastructure.

▌ Find and fix a bug in @filename                                                                                  
