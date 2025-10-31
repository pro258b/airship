// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IYieldAdapter} from "./IYieldAdapter.sol";

/// @title ProofOfPromise
/// @notice Upgradeable contract that escrows funds against time-bound promises with breach policies.
contract ProofOfPromise is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, EIP712Upgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    uint256 private constant MIN_DELAY_SECONDS = 5 * 365 days;
    uint256 private constant MAX_DELAY_SECONDS_BOUND = 10 * 365 days;
    address private constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    bytes32 private constant PROMISE_INTENT_TYPEHASH = keccak256(
        "PromiseIntent(address creator,address counterparty,address witness,uint8 assetType,address token,uint256 amount,uint256 targetCompletion,uint8 breachPolicy,address adapter,bytes32 commitmentHash,uint256 nonce)"
    );
    bytes32 private constant PROMISE_COMPLETION_TYPEHASH =
        keccak256("PromiseCompletion(uint256 promiseId,bytes32 commitmentHash,uint256 nonce)");

    enum AssetType {
        Native,
        ERC20
    }

    enum Status {
        Pending,
        Completed,
        Breached,
        Closed
    }

    enum BreachPolicy {
        DelayRelease,
        Burn,
        Donate
    }

    struct Promise {
        address creator;
        address counterparty;
        address witness;
        AssetType assetType;
        BreachPolicy policy;
        Status status;
        address tokenAddress;
        address adapter;
        bytes32 commitmentHash;
        uint256 principal;
        uint256 yieldShares;
        uint256 targetCompletion;
        uint256 createdAt;
        uint256 breachAt;
        uint256 breachUnlock;
    }

    struct CreateParams {
        address counterparty;
        address witness;
        AssetType assetType;
        address token;
        uint256 amount;
        uint256 targetCompletion;
        BreachPolicy policy;
        address adapter;
        bytes32 commitmentHash;
        uint256 counterpartyNonce;
        uint256 witnessNonce;
        bytes counterpartySignature;
        bytes witnessSignature;
    }

    mapping(uint256 => Promise) private _promises;
    mapping(address => uint256) public nonces;

    uint256 public nextPromiseId;
    address public treasury;
    uint256 public defaultDelaySeconds;
    uint256 public maxDelaySeconds;

    event PromiseCreated(
        uint256 indexed promiseId,
        address indexed creator,
        address indexed counterparty,
        uint256 amount,
        uint256 targetCompletion,
        BreachPolicy policy,
        address adapter,
        bytes32 commitmentHash
    );

    event PromiseCompleted(
        uint256 indexed promiseId,
        address indexed creator,
        address indexed attestor,
        uint256 amountPaid
    );

    event PromiseBreached(uint256 indexed promiseId, BreachPolicy policy, uint256 unlockTime, address indexed caller);
    event PromiseClosed(uint256 indexed promiseId, address indexed receiver, uint256 amountPaid);
    event FundsBurned(uint256 indexed promiseId, uint256 amount);
    event FundsDonated(uint256 indexed promiseId, address indexed recipient, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event DelayConfigurationUpdated(uint256 defaultDelaySeconds, uint256 maxDelaySeconds);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address oracle,
        address treasury_,
        uint256 defaultDelaySeconds_,
        uint256 maxDelaySeconds_
    ) external initializer {
        require(admin != address(0), "admin required");
        require(defaultDelaySeconds_ >= MIN_DELAY_SECONDS, "delay < 5y");
        require(defaultDelaySeconds_ <= MAX_DELAY_SECONDS_BOUND, "delay > 10y");
        require(maxDelaySeconds_ >= defaultDelaySeconds_, "max < default");
        require(maxDelaySeconds_ <= MAX_DELAY_SECONDS_BOUND, "max > 10y");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __EIP712_init("ProofOfPromise", "1");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURER_ROLE, admin);

        if (oracle != address(0)) {
            _grantRole(ORACLE_ROLE, oracle);
        }

        treasury = treasury_;
        if (treasury_ != address(0) && treasury_ != admin) {
            _grantRole(TREASURER_ROLE, treasury_);
        }

        defaultDelaySeconds = defaultDelaySeconds_;
        maxDelaySeconds = maxDelaySeconds_;
        nextPromiseId = 1;

        emit TreasuryUpdated(treasury_);
        emit DelayConfigurationUpdated(defaultDelaySeconds_, maxDelaySeconds_);
    }

    function setTreasury(address newTreasury) external onlyRole(TREASURER_ROLE) {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setDelays(uint256 newDefaultDelay, uint256 newMaxDelay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDefaultDelay >= MIN_DELAY_SECONDS, "delay < 5y");
        require(newDefaultDelay <= MAX_DELAY_SECONDS_BOUND, "delay > 10y");
        require(newMaxDelay >= newDefaultDelay, "max < default");
        require(newMaxDelay <= MAX_DELAY_SECONDS_BOUND, "max > 10y");

        defaultDelaySeconds = newDefaultDelay;
        maxDelaySeconds = newMaxDelay;
        emit DelayConfigurationUpdated(newDefaultDelay, newMaxDelay);
    }

    function createPromise(CreateParams calldata params) external payable nonReentrant returns (uint256 promiseId) {
        require(params.amount > 0, "amount=0");
        require(params.targetCompletion > block.timestamp, "target in past");
        require(params.commitmentHash != bytes32(0), "commitment required");
        require(params.counterparty != address(0) || params.witness != address(0), "attestor required");
        if (params.policy == BreachPolicy.Donate) {
            require(treasury != address(0), "treasury missing");
        }

        if (params.assetType == AssetType.Native) {
            require(params.token == address(0), "token disallowed");
            require(msg.value == params.amount, "value mismatch");
        } else {
            require(params.token != address(0), "token required");
            require(msg.value == 0, "no native value");
        }

        if (params.counterparty != address(0)) {
            require(params.counterpartySignature.length != 0, "counterparty sig");
            _validatePromiseIntent(params, params.counterparty, params.counterpartyNonce, params.counterpartySignature);
        }

        if (params.witness != address(0)) {
            require(params.witnessSignature.length != 0, "witness sig");
            _validatePromiseIntent(params, params.witness, params.witnessNonce, params.witnessSignature);
        }

        uint256 shares;
        if (params.assetType == AssetType.ERC20) {
            IERC20Upgradeable token = IERC20Upgradeable(params.token);
            token.safeTransferFrom(msg.sender, address(this), params.amount);
            if (params.adapter != address(0)) {
                token.safeApprove(params.adapter, params.amount);
                shares = IYieldAdapter(params.adapter).deposit(params.token, params.amount);
                token.safeApprove(params.adapter, 0);
            }
        } else if (params.adapter != address(0)) {
            shares = IYieldAdapter(params.adapter).deposit{value: params.amount}(address(0), params.amount);
        }

        promiseId = nextPromiseId++;
        Promise storage promiseData = _promises[promiseId];
        promiseData.creator = msg.sender;
        promiseData.counterparty = params.counterparty;
        promiseData.witness = params.witness;
        promiseData.assetType = params.assetType;
        promiseData.policy = params.policy;
        promiseData.status = Status.Pending;
        promiseData.tokenAddress = params.token;
        promiseData.adapter = params.adapter;
        promiseData.commitmentHash = params.commitmentHash;
        promiseData.principal = params.amount;
        promiseData.yieldShares = shares;
        promiseData.targetCompletion = params.targetCompletion;
        promiseData.createdAt = block.timestamp;

        emit PromiseCreated(
            promiseId,
            msg.sender,
            params.counterparty,
            params.amount,
            params.targetCompletion,
            params.policy,
            params.adapter,
            params.commitmentHash
        );
    }

    function confirmCompletion(
        uint256 promiseId,
        address attestor,
        uint256 attestorNonce,
        bytes calldata attestorSignature
    ) external nonReentrant {
        Promise storage promiseData = _promises[promiseId];
        require(promiseData.status == Status.Pending, "status");
        require(promiseData.commitmentHash != bytes32(0), "missing promiseData");

        bool callerIsOracle = hasRole(ORACLE_ROLE, msg.sender);
        if (!callerIsOracle) {
            require(msg.sender == promiseData.creator, "only creator/oracle");
        }

        address resolvedAttestor = attestor;
        if (callerIsOracle && resolvedAttestor == address(0)) {
            resolvedAttestor = msg.sender;
        }
        require(resolvedAttestor != address(0), "attestor required");

        bool attestorIsOracle = hasRole(ORACLE_ROLE, resolvedAttestor);
        bool attestorIsCounterparty = resolvedAttestor == promiseData.counterparty;
        bool attestorIsWitness = resolvedAttestor == promiseData.witness;
        require(attestorIsOracle || attestorIsCounterparty || attestorIsWitness, "invalid attestor");

        if (!(callerIsOracle && resolvedAttestor == msg.sender)) {
            require(attestorSignature.length != 0, "signature required");
            _validateCompletion(resolvedAttestor, attestorNonce, attestorSignature, promiseId, promiseData.commitmentHash);
        }

        promiseData.status = Status.Completed;
        uint256 paidAmount = _releaseFunds(promiseData, promiseData.creator);

        emit PromiseCompleted(promiseId, promiseData.creator, resolvedAttestor, paidAmount);
        emit PromiseClosed(promiseId, promiseData.creator, paidAmount);
    }

    function declareBreach(uint256 promiseId) external nonReentrant {
        Promise storage promiseData = _promises[promiseId];
        require(promiseData.status == Status.Pending, "status");
        require(block.timestamp > promiseData.targetCompletion, "deadline not passed");

        promiseData.status = Status.Breached;
        promiseData.breachAt = block.timestamp;

        if (promiseData.policy == BreachPolicy.DelayRelease) {
            uint256 unlock = block.timestamp + defaultDelaySeconds;
            promiseData.breachUnlock = unlock;
            emit PromiseBreached(promiseId, promiseData.policy, unlock, msg.sender);
        } else {
            address recipient = promiseData.policy == BreachPolicy.Burn ? DEAD_ADDRESS : treasury;
            if (promiseData.policy == BreachPolicy.Donate) {
                require(recipient != address(0), "treasury missing");
            }

            uint256 amountHandled = _resolveImmediateBreach(promiseId, promiseData, recipient);
            emit PromiseBreached(promiseId, promiseData.policy, 0, msg.sender);
            if (promiseData.policy == BreachPolicy.Burn) {
                emit FundsBurned(promiseId, amountHandled);
            } else {
                emit FundsDonated(promiseId, recipient, amountHandled);
            }
        }
    }

    function claimAfterDelay(uint256 promiseId) external nonReentrant {
        Promise storage promiseData = _promises[promiseId];
        require(promiseData.status == Status.Breached, "status");
        require(promiseData.policy == BreachPolicy.DelayRelease, "policy");
        require(block.timestamp >= promiseData.breachUnlock, "locked");
        require(msg.sender == promiseData.creator, "only creator");

        promiseData.status = Status.Closed;
        uint256 amount = _releaseFunds(promiseData, promiseData.creator);
        emit PromiseClosed(promiseId, promiseData.creator, amount);
    }

    function getPromise(uint256 promiseId) external view returns (Promise memory) {
        return _promises[promiseId];
    }

    function _validatePromiseIntent(
        CreateParams calldata params,
        address signer,
        uint256 nonce,
        bytes memory signature
    ) private {
        require(nonce == nonces[signer], "nonce mismatch");

        bytes32 structHash = keccak256(
            abi.encode(
                PROMISE_INTENT_TYPEHASH,
                msg.sender,
                params.counterparty,
                params.witness,
                uint8(params.assetType),
                params.token,
                params.amount,
                params.targetCompletion,
                uint8(params.policy),
                params.adapter,
                params.commitmentHash,
                nonce
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSAUpgradeable.recover(digest, signature);
        require(recovered == signer, "invalid signature");

        nonces[signer] = nonce + 1;
    }

    function _validateCompletion(
        address signer,
        uint256 nonce,
        bytes memory signature,
        uint256 promiseId,
        bytes32 commitmentHash
    ) private {
        require(nonce == nonces[signer], "nonce mismatch");

        bytes32 structHash = keccak256(
            abi.encode(PROMISE_COMPLETION_TYPEHASH, promiseId, commitmentHash, nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSAUpgradeable.recover(digest, signature);
        require(recovered == signer, "invalid signature");

        nonces[signer] = nonce + 1;
    }

    function _resolveImmediateBreach(
        uint256 promiseId,
        Promise storage promiseData,
        address recipient
    ) private returns (uint256 amount) {
        require(promiseData.policy != BreachPolicy.DelayRelease, "policy");

        promiseData.status = Status.Closed;
        amount = _releaseFunds(promiseData, recipient);

        emit PromiseClosed(promiseId, recipient, amount);
    }

    function _releaseFunds(Promise storage promiseData, address recipient) private returns (uint256 amount) {
        if (promiseData.adapter != address(0)) {
            address asset = promiseData.assetType == AssetType.Native ? address(0) : promiseData.tokenAddress;
            amount = IYieldAdapter(promiseData.adapter).withdraw(asset, promiseData.yieldShares, address(this));
        } else {
            amount = promiseData.principal;
        }

        if (promiseData.assetType == AssetType.Native) {
            if (amount > 0) {
                (bool sent, ) = payable(recipient).call{value: amount}("");
                require(sent, "native transfer failed");
            }
        } else {
            if (amount > 0) {
                IERC20Upgradeable token = IERC20Upgradeable(promiseData.tokenAddress);
                token.safeTransfer(recipient, amount);
            }
        }

        promiseData.principal = 0;
        promiseData.yieldShares = 0;
        promiseData.adapter = address(0);
        promiseData.breachUnlock = 0;

        return amount;
    }

    receive() external payable {}

    uint256[44] private __gap;
}