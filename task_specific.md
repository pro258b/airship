**Objective:** [Goal + success metric]  
**Context:** [Role + background]  
**Method:** [Reasoning steps: CoT/ToT/etc.]  
**Output:** [Exact format/schema]  
**Constraints:** [Rules, scope limits]  
**Depth:** [Level of detail, time horizon]  
**Meta:** [Self-check & verification]

**Objective:** [Goal + success metric]  
the code now can
 1. Copy monitoring/config.example.json to your own config, fill in RPC endpoints, vault/executor addresses, and
  per-token pool metadata (router, fee/path).
  2. Point state_file at a writable location if you want baseline persistence, then run
  monitoring.service.load_service_from_file(...).run_forever() under asyncio.
  3. Extend pool.metadata to describe additional DEX routers or hook in other adapters via DexAdapter when you’re
  ready for more venues.

  **Meta:** [Self-check & verification]
  when you give me function name, be sure to mention the file/module location containing it