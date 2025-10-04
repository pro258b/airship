Code Updates

  - Added a thin OZ proxy wrapper at contracts/proxy/AirshipProxy.sol:1 so Brownie can deploy the UUPS
  implementation behind an ERC1967Proxy.
  - Wrote the Brownie deployment helper scripts/deploy_airship_vault.py:1, which pulls the deployer key from
  DEPLOYER_PRIVATE_KEY, optionally reads DEPLOY_OWNER_ADDRESS, deploys the implementation, encodes the initializer,
  spins up AirshipProxy, and returns the proxied ERC20 instance.

  To use the script, export your private key (setx DEPLOYER_PRIVATE_KEY 0x... on Windows PowerShell or export
  on Unix), optionally set DEPLOY_OWNER_ADDRESS, then run brownie run scripts/deploy_airship_vault.py --network