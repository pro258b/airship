# Proof Of Promise Contracts

## Overview
- Deploy a transparent upgradeable proxy that delegates calls to a logic contract.
- Logic contract tracks time-bound promises funded with ETH or ERC-20 collateral.
- Completion is verified via EIP-712 signatures or an oracle attestation.
- Breaches trigger delayed withdrawal, burn, or donation according to user-selected policy.

## Contracts
1. `ProofOfPromiseProxy`
   - Transparent proxy per EIP-1967 storage slots (`admin`, `implementation`).
   - `admin` executes upgrades and maintenance calls; all other callers are forwarded with `delegatecall`.
   - Emits `Upgraded` on implementation changes.
2. `ProofOfPromise`
   - Uses OpenZeppelin upgradeable patterns (`Initializable`, `UUPSUpgradeable` alternative hidden by proxy).
   - Holds promise state, configuration, access control, and interaction logic.
   - Includes storage gap for future variables.
3. `YieldAdapter` interface
   - Minimal ERC-4626-style hooks: `deposit`, `withdraw`, `balanceOf`, `underlying()`.
   - Allows per-promise optional yield strategies without locking to one protocol.
4. `ITreasury`
   - Interface for donation recipient; keeps external integration loose.

## Storage Layout
- Global config: `admin`, `oracle`, `treasury`, `defaultDelayYears`, `maxDelayYears`.
- Mappings:
  - `promises[promiseId]` -> `Promise` struct.
  - `nonces[account]` for replay protection.
- `Promise` struct fields:
  - `creator`, `counterparty`, `witness` (optional oracle signer).
  - `assetType` enum (`Native`, `ERC20`).
  - `tokenAddress`, `principal`, `yieldShares`.
  - `adapter` address for yield vault; zero address means idle funds.
  - `commitmentHash` (EIP-712 primary hashed payload).
  - `targetCompletion`, `createdAt`, `breachAt`, `breachUnlock`.
  - `status` enum (`Pending`, `Completed`, `Breached`, `Closed`).
  - `breachPolicy` enum (`DelayRelease`, `Burn`, `Donate`).

## Lifecycle
1. `createPromise` (payable or ERC-20 approval required)
   - Validates signature authorizing commitment terms.
   - Transfers funds to contract or adapter.
   - Generates sequential `promiseId` and stores struct.
   - Emits `PromiseCreated`.
2. `confirmCompletion`
   - Requires signatures from both creator and counterparty or designated oracle.
   - Withdraws from adapter if necessary.
   - Transfers principal plus optional yield incentive back to creator.
   - Marks promise `Completed`, emits `PromiseCompleted`.
3. `declareBreach`
   - Callable after `targetCompletion` passes without completion confirmation.
   - Records breach timestamp and computes `breachUnlock` when policy is `DelayRelease`.
   - For `Burn` or `Donate` policies, immediately forwards funds to sink address or treasury.
   - Emits `PromiseBreached`.
4. `claimAfterDelay`
   - Only available for `DelayRelease` policy when `block.timestamp >= breachUnlock`.
   - Withdraws funds and transfers principal (and yield) to creator.
   - Sets status to `Closed`, emits `PromiseClosed`.

## Access Control & Roles
- `DEFAULT_ADMIN_ROLE` (proxy admin) manages upgrades and role assignments.
- `ORACLE_ROLE` accounts may supply completion signatures or attestations.
- `TREASURER_ROLE` may adjust treasury address and donation logic.
- Use OpenZeppelin `AccessControlUpgradeable` for safety and event emission.

## Signature Scheme
- EIP-712 domain: name `ProofOfPromise`, version `1`, chainId from context, verifying contract is proxy address.
- Struct hash includes `promiseId`, `commitmentHash`, `targetCompletion`, `assetType`, `tokenAddress`, `principal`, `breachPolicy`, `adapter`.
- Nonce increments per signer to prevent replay across upgrades.

## Upgrade & Initialization Flow
1. Deploy logic contract and proxy with proxy admin.
2. Initialize proxy via `initialize(admin, oracle, treasury, defaultDelay, maxDelay)`.
3. Future upgrades require admin call to proxy `upgradeTo`.
4. Logic contract exposes `postUpgrade(bytes calldata)` for config migrations executed via proxy.

## Security Notes
- Guard external entry points with `nonReentrant`.
- Validate ERC-20 transfers using OZ `SafeERC20` library.
- Reject zero principal or zero target completion.
- Ensure donation/burn addresses are immutable constants to avoid misdirection.
- Maintain storage gap for new fields: `uint256[50] private __gap;`.

## Testing Focus
- Promise creation across ETH and ERC-20 pathways.
- Completion flow with and without yield adapter.
- Breach scenarios for each policy.
- Delay unlock timing, including leap year calculations (use seconds approximation).
- Upgrade simulation ensuring storage layout remains intact.
- Signature validation and replay defense.