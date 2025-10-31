## Stage 1: Planning & Analysis
**Goal**: Capture existing deployment patterns and confirm design scope.
**Success Criteria**: Plan documented, dependencies identified, design synced with proof_of_promise_design.md.
**Tests**: None.
**Status**: Complete

## Stage 2: Proxy Contract
**Goal**: Add upgradeable proxy wrapper tailored for ProofOfPromise.
**Success Criteria**: Proxy contract compiles, follows EIP-1967 storage, and integrates with deployment scripts.
**Tests**: Brownie/Foundry compilation (to be run later).
**Status**: Complete

## Stage 3: Logic Contract
**Goal**: Implement ProofOfPromise logic contract with storage layout, lifecycle, and access control.
**Success Criteria**: Contract compiles; functions implemented with events, modifiers, and safety checks.
**Tests**: Unit coverage for create, confirm, breach, delay (to be authored later).
**Status**: Complete

## Stage 4: Test Strategy
**Goal**: Outline priority tests and validation steps for new contracts.
**Success Criteria**: Documented checklist for future test implementation.
**Tests**: n/a.
**Status**: Complete

### Recommended Tests
- Deploy proxy + implementation; call `initialize` and assert roles, delays, treasury.
- `createPromise` happy paths for native & ERC20 (with/without adapter) verifying funds locked and events emitted.
- Signature validation: reject mismatched nonces, invalid signatures, missing attestors.
- `confirmCompletion` returns funds, consumes nonces, prevents replay.
- `declareBreach` coverage: delay policy sets unlock, burn sends to dead address, donate routes to treasury.
- `claimAfterDelay` enforces lock period and restricts caller.
- Upgrade safety: simulate upgrade through proxy ensuring storage layout unchanged (check `nextPromiseId`, `promises` integrity).
## Stage 5: Frontend Planning
**Goal**: Outline ProofOfPromise UI flows and integration requirements before implementation.
**Success Criteria**: Document data needs, interactions, and assets that align with contract roles and permissions.
**Tests**: Peer/self review against contract functions.
**Status**: Complete

## Stage 6: Frontend Implementation
**Goal**: Deliver deployable HTML/JS frontend enabling promise lifecycle operations on ProofOfPromise.
**Success Criteria**: Page loads without console errors; can create promises, confirm completion, trigger breach/delay paths, and fetch promise data via configured RPC.
**Tests**: Manual browser checks using local RPC fork or testnet.
**Status**: Complete





## Stage 7: Dart Mini-Game
**Goal**: Ship an interactive dart-to-airship luck game page with clear hit/miss feedback.
**Success Criteria**: New HTML runs offline, dart collision triggers lottery win messaging, misses prompt retry, no console errors.
**Tests**: Manual browser run through hit/miss scenarios.
**Status**: Complete

## Stage 8: Stripe Price Synchronisation
**Goal**: Connect shop inventory to Stripe pricing and expose consumable tags.
**Success Criteria**: Script generates/updates stripe-prices.json via Stripe API without committing secrets; shop.js recognises price tags.
**Tests**: Manual run of scripts/stripe_price_manager.js dry-run; browser reload verifying price hydration fallback.
**Status**: Complete

