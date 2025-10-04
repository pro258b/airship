brownie compile

brownie run scripts/deploy.py --network rinkeby

# can manually setup brownie-config.yaml in $HOME

 - IFxMessageProcessor

brownie pm install OpenZeppelin/openzeppelin-contracts@4.9.3
     brownie pm install OpenZeppelin/openzeppelin-contracts-upgradeable@4.9.3


ImportError: cannot import name 'AirshipVaultToken' from 'brownie' (C:\Users\hunte\pipx\venvs\eth-brownie\lib\site-packages\brownie\__init__.py)

Set the variable before running Brownie (Windows PowerShell): setx WEB3_INFURA_PROJECT_ID your-infura-project-
  id. Then restart the shell so Brownie picks it up.
  - If you’re using a .env loader, make sure the value is plain (no $). Brownie will substitute it automatically.
  - Alternatively, edit brownie-config.yaml/network settings to hard-code the RPC URL or point to a different
  provider that doesn’t need environment expansion.


  brownie pm install OpenZeppelin/openzeppelin-contracts@4.9.3

  After running brownie pm
  install OpenZeppelin/openzeppelin-contracts@4.9.3, add or update brownie-config.yaml in your project root so the
  compiler remaps that namespace:

  compiler:
    solc:
      remappings:
        - "@openzeppelin=OpenZeppelin/openzeppelin-contracts@4.9.3"



## ERROR HISTORY:

- CompilerError: solc returned the following errors:

CompilerError: Stack too deep. Try compiling with `--via-ir` (cli) or the equivalent `viaIR: true` (standard JSON) while enabling the optimizer. Otherwise, try removing local variables.
  --> contracts/AirshipVaultToken.sol:94:27:
   |
94 |         emit SwapExecuted(dex, tokenIn, tokenOut, amountIn, amountOut, recipient);

• I’m putting together a clear summary referencing the exact files changed—brownie-config.yaml and
  AirshipVaultToken.sol—and explaining the new SwapContext struct and helper function added to improve the code.
  I’ll also suggest the user rerun compilation since I can’t run tests myself.

> Added IR compilation hints to the Brownie project config so solc can use the IR pipeline (deploy_contract/
  brownie-config.yaml:7). Refactored swapTokens to keep fewer stack variables by caching token refs in a
  lightweight struct and moving the dex call into _performDexCall, which resolves the stack-too-deep issue
  while preserving behaviour (deploy_contract/contracts/AirshipVaultToken.sol:18, deploy_contract/contracts/
  AirshipVaultToken.sol:51, deploy_contract/contracts/AirshipVaultToken.sol:73, deploy_contract/contracts/
  AirshipVaultToken.sol:97).

  Please rerun brownie compile in deploy_contract; Brownie will reuse the cached OpenZeppelin packages.
