Highlights

  - deploy_contract/monitoring/config.py:62 now resolves every $ENV_VAR placeholder via the process environment (lists/
  dicts included), so no addresses or RPC URLs are persisted in config files.
  - Added deploy_contract/monitoring/pool_lookup/ with quote parsing, Uniswap v2/v3 scanners, and a find_pools service
  (service.py:24) that proposes pool-env names, metadata, and router placeholders for any ERC‑20.
  - deploy_contract/monitoring/token_discovery.py:158 auto-whitelists new tokens and populates matching Uniswap pools,
  printing the env vars you must export to persist the configuration.
  - Updated config scaffolding (config.example.json:10) and README (README.md:21) with the new env workflow
  (MONITOR_QUOTE_CANDIDATES, UNIV2/3_FACTORY, UNIV2/3_ROUTER, etc.).
  - deploy_contract/monitoring/run.py:9 now targets config.json and fails fast when required env vars are missing.

  Using the pool lookup

  from monitoring.pool_lookup import find_pools

  matches = find_pools(
      "0xYourToken…",
      token_env_var="MONITOR_TOKEN_YOURTOKEN",  # optional, auto-derived if omitted
  )
  for match in matches:
      print(match.pool_address, match.pool_env, match.quote_env, match.dex, match.fee)

  Each PoolMatch supplies:

  - pool_env / pool_placeholder – export MONITOR_POOL…=<pool address> when you’re ready.
  - quote_placeholder – the quote asset placeholder (taken from MONITOR_QUOTE_CANDIDATES).
  - metadata – adapter-ready dict (router + path/deadline buffer).

  discover_new_tokens now calls the same helper automatically; check the log for new token discovered and suggested pool
  messages, then export the printed env vars so the config picks up real addresses on the next run.

  Before running

  1. Copy deploy_contract/monitoring/config.example.json → config.json, keep only placeholders.
  2. Export required variables, e.g.:
      - MONITOR_RPC_HTTP, MONITOR_VAULT_ADDRESS, MONITOR_EXECUTOR_ADDRESS
      - MONITOR_QUOTE_CANDIDATES='["$TOKEN_USDC","$TOKEN_USDT","$TOKEN_WETH"]' plus the referenced quote vars.
      - UNIV2_FACTORY, UNIV2_ROUTER, UNIV3_FACTORY, UNIV3_ROUTER, and (optionally) UNIV3_FEE_TIERS.
  3. Run python -m deploy_contract.monitoring.run.



Code Updates

  - Added a thin OZ proxy wrapper at contracts/proxy/AirshipProxy.sol:1 so Brownie can deploy the UUPS
  implementation behind an ERC1967Proxy.
  - Wrote the Brownie deployment helper scripts/deploy_airship_vault.py:1, which pulls the deployer key from
  DEPLOYER_PRIVATE_KEY, optionally reads DEPLOY_OWNER_ADDRESS, deploys the implementation, encodes the initializer,
  spins up AirshipProxy, and returns the proxied ERC20 instance.

  To use the script, export your private key (setx DEPLOYER_PRIVATE_KEY 0x... on Windows PowerShell or export
  on Unix), optionally set DEPLOY_OWNER_ADDRESS, then run brownie run scripts/deploy_airship_vault.py --network


  ## design 2 - swap

  thanks! Now I need another  python or solidity file (or both), that can 'detect tokens hold in AirshipVaultToken
▌ price change in Uniswap' and swap out 50% when price raise above a threshould. Don't write code, design it so
▌ later it can be easily extned to more defi swap etc



• I'm outlining a design spec for detecting AirshipVaultToken price changes on Uniswap and swapping 50% when the
  price crosses a threshold. I'll suggest a dual approach: an on-chain Solidity component for automation and an
  off-chain Python service for monitoring and orchestration. The design will cover modules, interactions, price
  detection methods (like TWAP or oracles), configurability for thresholds and risk, plus pathways for future DeFi
  extensions—all presented concisely with clear suggestions.

> High-Level Plan

  - Monitoring runs off-chain (Python service) to query Uniswap pools, compute price moves for the
  AirshipVaultToken’s held assets, and trigger swaps through Brownie/ethers.js when thresholds are crossed.
  - On-chain helper contracts encapsulate swap logic and guardrails so automated callers can act safely.

  Python Service Design

  - config.py: token list, Uniswap pool addresses, target thresholds, swap percentages, rate limits.
  - price_feeds.py: adapters for Uniswap v2/v3 quoting (reads reserves/slot0, handles TWAP windows, revert
  protection).
  - inventory.py: pulls AirshipVaultToken ERC20 balances via JSON-RPC; caches results for threshold comparisons.
  - strategy.py: compares current vs. baseline prices, tracks hysteresis and cool-downs, decides when 50% sell
  is required.
  - executors/swapper.py: builds calldata for AirshipVaultToken’s swapTokens, selecting specific DEX adapter
  contract & slippage params; submits via Brownie or ethers.js, includes gas price controls.
  - alerts.py: logs events, notifies operators, persists state (e.g., last trigger price).
  - Extensibility: add new DEX adapters by registering a new price adapter + execution handler; extend config
  schema to support pool metadata (curve, balancer). Inject risk checks (max daily volume, health-check runs).

  On-Chain Support Contracts

  - DexAdapter interface: abstract quoteSwap + executeSwap functions; concrete implementations for Uniswap v2, v3
  (supports path routing, fee tiers).
  - VaultGuardian contract: whitelisted automation agent; enforces per-token threshold configs stored on-chain,
  wraps calls to AirshipVaultToken.swapTokens, emits events for off-chain auditors.
  - Storage layout mindful of upgradeability; emit granular events (PriceThresholdBreached, SwapExecuted) to drive
  monitoring.
  - Upgrade path: add adapters for Curve, Balancer; allow percentage-based or absolute sell instructions.

  Data Flow

  1. Scheduler (cron/kubernetes job, serverless) calls Python monitor.
  2. Monitor reads prices (spot + TWAP), applies strategy; if threshold met, prepares swap instructions (token,
  amount=50% balance, minOut).
  3. Executor sends tx to VaultGuardian (or directly to AirshipVaultToken) calling chosen adapter; on-chain
  contract enforces rules and emits events.
  4. Logs & state updated; baseline price reset per strategy configuration.

  Key Considerations

  - Price integrity: prefer Uniswap TWAPs or Chainlink as secondary check to avoid flash-loan spikes.
  - Slippage control: compute minAmountOut from quotes minus buffer; track liquidity depth.
  - Access control: restrict executor role (EOA, multisig, or automation network like Gelato).
  - Testing: simulate price moves with forks, add integration tests for threshold triggers, ensure gas usage within
  bounds.
  - Extensibility: modular adapters, config-driven thresholds, generic executor pipeline allow plugging in new
  DEXs/conditions without rewriting core logic.

  Next steps: decide whether to prioritize off-chain automation (faster iteration) or on-chain autonomous triggers
  (e.g., Chainlink Automation), then flesh out interfaces and deployment plan.


  ## use existing modules
   Arbitrum Bot

  - arbitrum_bot.py:66 shows a resilient asyncio orchestration layer that spins up dedicated tasks for block
  watching, event ingestion, balance tracking, and execution queues; reuse this scheduler pattern for the off-chain
  monitor that will watch prices and trigger swaps.
  - arbitrum_lp_fetcher_uniswapv3_json.py:8 demonstrates incremental Uniswap pool discovery with adaptive log
  ranges and on-disk caching—pattern fits our need to keep pool metadata fresh without re-downloading the world.
  - arbitrum_uniswapv3_liquidity_events_fetcher.py:20 captures a full state-sync loop (snapshot restore → batched
  Mint/Burn log processing → serialized state) that can seed historical price baselines or warm-start liquidity
  data before live monitoring begins.

  Degenbot

  - src/degenbot/config.py:1 provides a Pydantic-driven configuration system (typed settings, persisted TOML,
  Alembic hook) we can mimic for strategy thresholds, token lists, and DEX adapters.
  - src/degenbot/connection/async_connection_manager.py:8 centralizes AsyncWeb3 instances with retry/health checks;
  ideal foundation for a multi-chain RPC pool feeding our monitor.
  - src/degenbot/uniswap/v3_liquidity_pool.py:1 exposes rich Uniswap pool abstractions (state cache, publisher/
  subscriber updates, deterministic addressing) we can wrap to quote prices, compute deltas, and drive swap
  calldata without re-implementing AMM math.

  Implications for the New Design

  - Build the monitoring daemon atop the arbitrum_bot asyncio/task layout, swapping in degenbot pool helpers for
  state math and using the existing log-fetcher approach to keep price baselines current.
  - Reuse degenbot’s connection manager and config patterns to keep the system chain-agnostic and extensible to
  future DEX adapters; plug in additional fetchers following the arbitrum_bot JSON snapshot style when new venues
  are added.
  - Combine these assets into a modular pipeline: config-driven asset list → shared Web3 connections → degenbot
  pool wrappers for quoting → orchestration loop from arbitrum_bot to decide when the 50% swap trigger fires, ready
  for future expansion into other DeFi venues.


  ### revising action:

  > Auto Discovery

  - Extended the config loader to remember its source path so runtime tools know where to write updates
  (monitoring/config.py:49).
  - MonitorService now accepts auto_discover/discovery_lookback flags; each cycle it scans recent Transfer logs
  into the vault, writes any new ERC‑20s into the config, reloads, and keeps monitoring (monitoring/service.py:29,
  monitoring/service.py:130).
  - Added token_discovery.discover_new_tokens, which you can call directly to backfill a block range; it records
  symbol/decimals when available and appends a placeholder entry in the config (monitoring/token_discovery.py:1).
  - Updated the README with the new workflow and manual discovery notes (monitoring/README.md:1).

  How to Use

  - Copy monitoring/config.example.json to a writable config, then launch the monitor with auto_discover=True and
  a lookback large enough to cover any historical deposits; newly detected tokens will be appended with empty pools
  so you can fill in swap routing later.
  - For one-off backfills or scripts, call discover_new_tokens(config_path, from_block=..., to_block=...) to mutate
  the config outside the service loop.

  Notes

  - The discovery step only tracks that a token arrived; you still need to populate its pool metadata before swaps
  can execute.
  - No automated tests were run here—give the discovery run a try on a forked node or small block window first to
  confirm your RPC permissions.