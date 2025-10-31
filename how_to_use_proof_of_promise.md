# Using ProofOfPromise Contracts

This guide explains how to configure, deploy, and operate the ProofOfPromise proxy + implementation pair. It covers transferring funds into a promise, signing commitments, reclaiming funds on completion or breach, and verifying sources on Etherscan.

## 1. Prerequisites
- Brownie installed and configured with your preferred Ethereum network.
- Access to a funded deployer account (environment variable `DEPLOYER_PRIVATE_KEY`).
- Optional: accounts for proxy admin, oracle, and donation treasury.
- Tooling to produce EIP-712 signatures (Brownie accounts, Hardhat, ethers.js, etc.).

## 2. Deployment Steps
1. **Set environment variables**
   ```sh
   export DEPLOYER_PRIVATE_KEY=0x...
   export PROOF_PROMISE_PROXY_ADMIN=0xAdminAddress   # optional
   export PROOF_PROMISE_ORACLE=0xOracleAddress      # optional
   export PROOF_PROMISE_TREASURY=0xTreasuryAddress  # optional (required for Donate policy)
   export PROOF_PROMISE_DEFAULT_DELAY=157680000     # optional (5 years default)
   export PROOF_PROMISE_MAX_DELAY=315360000         # optional (10 years default)
   ```
2. **Run deployment script**
   ```sh
   brownie run scripts/deploy_proof_of_promise.py --network <network>
   ```
   The script deploys `ProofOfPromise`, initializes it through `ProofOfPromiseProxy`, and prints implementation/proxy addresses.

## 3. Creating a Promise
- Parties: `creator` funds the promise, `counterparty` co-signs, optional `witness` or oracle provides backup attestation.
- Inputs: asset type (native or ERC-20), principal amount, target completion timestamp, breach policy (DelayRelease, Burn, Donate), optional yield adapter, and a commitment hash (hash of off-chain agreement text).

### 3.1 Prepare Signatures (EIP-712)
Each attestor (counterparty and/or witness) signs structured data:
```
PromiseIntent(
  creator,
  counterparty,
  witness,
  assetType,
  token,
  amount,
  targetCompletion,
  breachPolicy,
  adapter,
  commitmentHash,
  nonce
)
```
- `nonce` is the value returned by `nonces(attestor)` before signing.
- Use a wallet or script (e.g., Brownie account) to sign the typed data with domain `{name: "ProofOfPromise", version: "1", chainId, verifyingContract: proxyAddress}`.

### 3.2 Call `createPromise`
```python
params = (
    counterparty,
    witness,
    assetType,
    tokenAddress,
    principal,
    targetCompletion,
    breachPolicy,
    adapter,
    commitmentHash,
    counterpartyNonce,
    witnessNonce,
    counterpartySignature,
    witnessSignature,
)
contract.createPromise(params, {"from": creator, "value": principal_if_native})
```
The transaction emits `PromiseCreated` and returns a `promiseId`.

## 4. Claiming on Successful Completion
1. Attestor (counterparty, witness, or oracle) signs EIP-712 `PromiseCompletion(promiseId, commitmentHash, nonce)` using their current nonce.
2. `creator` or an oracle calls:
```python
contract.confirmCompletion(
    promiseId,
    attestorAddress,
    attestorNonce,
    attestorSignature,
    {"from": creator_or_oracle}
)
```
- On success, `PromiseCompleted` fires and the funds (plus any adapter yield) return to the creator.

## 5. Handling Breaches
- Anyone may call `declareBreach(promiseId)` once `block.timestamp > targetCompletion` and the promise remains pending.
- Outcomes:
  - **DelayRelease**: contract locks funds until `targetCompletion + defaultDelaySeconds`. Creator later calls `claimAfterDelay(promiseId)`.
  - **Burn**: funds transfer to the burn address immediately.
  - **Donate**: funds route to the configured treasury. Ensure `PROOF_PROMISE_TREASURY` was set.

## 6. Administrative Functions
- `setTreasury(newTreasury)` by `TREASURER_ROLE` adjusts donation destination.
- `setDelays(newDefault, newMax)` by `DEFAULT_ADMIN_ROLE` tweaks lock durations.
- Upgrades follow the transparent proxy pattern: proxy admin calls `upgradeTo` on `ProofOfPromiseProxy` with a new implementation address.

## 7. Verifying on Etherscan
You can verify the proxy and implementation sources directly on Etherscan without Python tooling.
1. **Collect compilation settings**
   - Compiler version: `v0.8.20+commit.a1b79de6`
   - Optimizer enabled: `true`
   - Optimizer runs: `200`
   - Via-IR: enabled
   - EVM version: Istanbul (default)
2. **Prepare Standard JSON input**
   - In Brownie, run `brownie compile --json` or use the generated `build/contracts/*.json` files to copy the `source` and `settings` blocks, preserving the `language` field and remappings.
   - Alternatively, use the UI described below to assemble the JSON from the three `.sol` files.
3. **Submit via Etherscan**
   - Navigate to the implementation contract address ? ?Code? tab ? ?Verify & Publish?.
   - Choose ?Solidity (Single file)? if you flatten manually, or ?Solidity (Standard-Json-Input)? to paste the JSON blob produced in step 2.
   - Paste constructor arguments (ABI-encoded) if verifying the proxy (generated in deployment logs). For `ProofOfPromise` implementation, constructor args are empty because it is initializable.
   - Provide your Etherscan API key if using the API endpoint directly (`https://api.etherscan.io/api?module=contract&action=verifysourcecode`).

Repeat for `ProofOfPromiseProxy` (constructor args: logic address, admin, initializer calldata) if you want the proxy verified as well.

## 8. Testing Checklist
- Use `brownie test tests/test_proof_of_promise.py` after installing Ganache (or another RPC backend).
- Extend the test suite with project-specific edge cases (adapter failures, oracle signature flows, donation address swaps).

By following these steps, users can safely fund promises, collect confirmations, enforce breach policies, and verify the upgradeable ProofOfPromise contract suite on Etherscan.