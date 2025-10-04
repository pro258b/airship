brownie compile

brownie run scripts/deploy.py --network rinkeby

# can manually setup brownie-config.yaml

 - IFxMessageProcessor

SUCCESS: Package 'OpenZeppelin/openzeppelin-contracts@4.9.3' has been installed

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


ParserError: Source "C:/Users/hunte/.brownie/packages/OpenZeppelin/openzeppelin-contracts-upgradeable@4.9.3/token/ERC20/IERC20Upgradeable.sol" not found: File not found. Searched the following locations: "".
 --> contracts/AirshipVaultToken.sol:9:1:
  |
9 | import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
  | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


ParserError: Source "C:/Users/hunte/.brownie/packages/OpenZeppelin/openzeppelin-contracts-upgradeable@4.9.3/token/ERC20/utils/SafeERC20Upgradeable.sol" not found: File not found. Searched the following locations: "".
  --> contracts/AirshipVaultToken.sol:10:1:
   |
10 | import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    Both remappings now point directly into each package’s contracts folder (brownie-config.yaml:7). That resolves
  the missing Initializable.sol error. Please rerun brownie compile; it should succeed once Brownie picks up the
  new remappings.

  CompilerError: Stack too deep. Try compiling with `--via-ir` (cli) or the equivalent `viaIR: true` (standard JSON) while enabling the optimizer. Otherwise, try removing local variables.
  --> contracts/AirshipVaultToken.sol:94:27:
   |
94 |         emit SwapExecuted(dex, tokenIn, tokenOut, amountIn, amountOut, recipient);