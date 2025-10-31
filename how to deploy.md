brownie compile
brownie test tests/test_proof_of_promise.py
brownie run scripts/deploy.py --network bsc-main
brownie run scripts/deploy_proof_of_promise.py --network bsc-main

# can manually setup brownie-config.yaml

## to do for loveslock contract

ENV_PROXY_ADMIN

 - IFxMessageProcessor

SUCCESS: Package 'OpenZeppelin/openzeppelin-contracts@4.9.3' has been installed

ImportError: cannot import name 'AirshipVaultToken' from 'brownie' (C:\Users\hunte\pipx\venvs\eth-brownie\lib\site-packages\brownie\__init__.py)

Set the variable before running Brownie (Windows PowerShell): setx WEB3_INFURA_PROJECT_ID your-infura-project-
  id. Then restart the shell so Brownie picks it up.
  - If you’re using a .env loader, make sure the value is plain (no $). Brownie will substitute it automatically.
  - Alternatively, edit brownie-config.yaml/network settings to hard-code the RPC URL or point to a different
  provider that doesn’t need environment expansion.


  brownie pm install OpenZeppelin/openzeppelin-contracts@4.9.3

 Fit For Airship

  - Forta bots watch chains continuously, emit structured alerts, and can trigger automation via webhooks. That
  complements your Brownie scripts nicely: Forta spots an inbound Transfer and pings your infra; your own tooling
  decides whether to call sweepToken or run transfer_token_from_vault.py.
  - It’s realistic if you’re willing to deploy/host a Forta agent (either on Forta’s decentralized network or self-
  hosted). You’ll need: a Forta agent container (from the repo), JSON-RPC access to BSC (if running privately), and
  somewhere to forward alerts (REST endpoint, queue, etc.).
  - Integration model:
      1. Clone forta-bot-examples, copy filter-event-and-function-py.
      2. Replace ABI/address filters with your vault proxy/token(s); emit an alert whenever to == vault and value
  > 0.
      3. Deploy the bot; configure Forta to hit a webhook you control.
      4. Build a small listener (FastAPI, Lambda, etc.) that receives the alert payload and invokes a job runner
  script which, in turn, calls brownie run ... transfer_token_from_vault.py --vault_address ... --token_address ...
  --amount ... --auto_confirm True.
      5. Guard with business logic (e.g., check allowlist/thresholds before sweeping).

  Absorbing Industry-Grade Pieces

  - Treat their code as a pattern: focus on how they parse logs, structure findings, and package bots. You can lift
  the architecture while keeping your repo’s scripts independent.
  - Keep your POC modular: keep Brownie deployment/sweep scripts in scripts/, add a new monitoring/forta_bot/
  folder with adapted agent code and Dockerfile, plus a small glue service that bridges alerts to Brownie commands.
  - Document operational runbooks: how to update the bot, redeploy, rotate keys, test locally.
  - Start small (monitor only, no automatic sweep), then add automation once alert flow is stable.

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