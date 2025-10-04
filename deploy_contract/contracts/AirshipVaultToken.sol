// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/// @title AirshipVaultToken
/// @notice Upgradeable ERC20 token that can custody arbitrary ERC20 assets for later recovery or swaps.
contract AirshipVaultToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct SwapContext {
        IERC20Upgradeable inToken;
        IERC20Upgradeable outToken;
        uint256 balanceBefore;
    }

    event TokenSwept(address indexed token, address indexed recipient, uint256 amount);
    event SwapExecuted(
        address indexed dex,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string memory name_, string memory symbol_, address owner_) external initializer {
        __ERC20_init(name_, symbol_);
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        if (owner_ != address(0) && owner_ != _msgSender()) {
            _transferOwnership(owner_);
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    function sweepToken(address token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        require(recipient != address(0), "recipient required");
        IERC20Upgradeable(token).safeTransfer(recipient, amount);
        emit TokenSwept(token, recipient, amount);
    }

    function sweepNative(address payable recipient, uint256 amount) external onlyOwner nonReentrant {
        require(recipient != address(0), "recipient required");
        recipient.transfer(amount);
    }

    function swapTokens(
        address dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        bytes calldata data
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(dex != address(0), "dex required");
        require(recipient != address(0), "recipient required");
        require(tokenIn != tokenOut, "token mismatch");
        require(amountIn > 0, "amountIn = 0");

        SwapContext memory swap;
        swap.inToken = IERC20Upgradeable(tokenIn);
        swap.outToken = IERC20Upgradeable(tokenOut);

        swap.inToken.safeApprove(dex, 0);
        swap.inToken.safeApprove(dex, amountIn);

        swap.balanceBefore = swap.outToken.balanceOf(address(this));
        _performDexCall(dex, data);

        amountOut = swap.outToken.balanceOf(address(this)) - swap.balanceBefore;
        require(amountOut >= minAmountOut, "slippage");

        swap.inToken.safeApprove(dex, 0);
        swap.outToken.safeTransfer(recipient, amountOut);

        emit SwapExecuted(dex, tokenIn, tokenOut, amountIn, amountOut, recipient);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _performDexCall(address dex, bytes calldata data) private {
        (bool success, bytes memory returndata) = dex.call(data);
        if (!success) {
            _revertWithReason(returndata, "swap failed");
        }
    }

    function _revertWithReason(bytes memory returndata, string memory defaultMessage) private pure {
        if (returndata.length > 0) {
            assembly {
                let returndata_size := mload(returndata)
                revert(add(returndata, 32), returndata_size)
            }
        } else {
            revert(defaultMessage);
        }
    }

    receive() external payable {}

    uint256[45] private __gap;
}
