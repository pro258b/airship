can't use Brownie as its own runtime artefact


  Generating Standard JSON

  - Assemble a Standard JSON object with language, settings (solc 0.8.20, optimizer settings copied from the
  compiler block), and a sources map that includes every Solidity file path plus its raw contents, resolving the
  OpenZeppelin dependencies under build/contracts/dependencies/OpenZeppelin/....
  - Example extraction command: python -m solcx --std-json-input <input.json >output.json; the <input.json file
  must define the structure above, so script a builder that reads each Solidity file and injects it into the
  sources map before piping into solcx.compile_standard.
  
  
  Use Brownie by mirroring the Hardhat workflow: add OpenZeppelin/openzeppelin-contracts-upgradeable@4.9.3
  under dependencies in brownie-config.yaml, point compiler.solc.version to 0.8.20, and mirror optimizer
  settings. Run brownie pm install OpenZeppelin/openzeppelin-contracts-upgradeable@4.9.3, then brownie
  compile to generate the exact Standard JSON payload Brownie stores in build/contracts/ProofOfPromise.json.
  To confirm on BscScan, run a script that loads the already-deployed implementation and calls
  ProofOfPromise.publish_source(ProofOfPromise.at("0x...")) on --network bsc-main. Brownie packages the Standard
  JSON Input and pushes it to BscScan, eliminating the missing-import errors. Handle the proxy separately by
  verifying the logic contract first, then registering the proxy address via BscScan’s UUPS interface. No Python
  decorators used.
  
  
  Single-file verifier rejects @openzeppelin/... imports because BscScan cannot resolve Node-style paths.
  - Provide Standard JSON Input: compile with solc 0.8.20 using Hardhat or Foundry, copy the input object from
  artifacts/build-info/*.json, paste it in BscScan’s “Standard JSON” form, select compiler 0.8.20, mirror the
  optimization flag, and set the fully qualified name contracts/ProofOfPromise.sol:ProofOfPromise.
  - Flatten the contract locally after installing @openzeppelin/contracts-upgradeable, inline every imported
  source, keep a single SPDX header plus the original pragma, and submit the flattened file through the single-
  file verifier.
  - Verify ProofOfPromise (implementation) before ProofOfPromiseProxy, then register the proxy via the UUPS option
  and supply the deployment constructor bytes when prompted.
  - Inline every OpenZeppelin dependency inside the submission; otherwise BscScan will continue to raise “File
  import callback not supported”.

  Python Decorators

  - No decorators used; nothing to report.
  
  
  Option C — Etherscan “Standard JSON Input” (manual but bulletproof)

Get the build-info (Hardhat) or metadata (Foundry):

Hardhat: artifacts/build-info/<hash>.json (contains input and settings)

Foundry: out/<Contract>.sol/<Contract>.json → grab the metadata field (it’s a JSON with compiler, settings, sources)

On Etherscan → Verify → “Standard JSON Input” tab.
Paste the entire compiler input JSON (the input section with all sources, exactly keyed by their import paths such as @openzeppelin/contracts-upgradeable/..., plus your ./IYieldAdapter.sol).
Set compiler version to match. Submit.

This method gives Etherscan every file it needs, so there’s no “file import callback” problem.