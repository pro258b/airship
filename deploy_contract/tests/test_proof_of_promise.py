import pytest
from eth_account.messages import encode_structured_data
from hexbytes import HexBytes

from brownie import (
    ProofOfPromise,
    ZERO_ADDRESS,
    accounts,
    chain,
    reverts,
    web3,
)

DEFAULT_DELAY = 5 * 365 * 24 * 60 * 60
ONE_WEEK = 7 * 24 * 60 * 60

EIP712_DOMAIN_TYPE = [
    {"name": "name", "type": "string"},
    {"name": "version", "type": "string"},
    {"name": "chainId", "type": "uint256"},
    {"name": "verifyingContract", "type": "address"},
]

PROMISE_INTENT_TYPE = [
    {"name": "creator", "type": "address"},
    {"name": "counterparty", "type": "address"},
    {"name": "witness", "type": "address"},
    {"name": "assetType", "type": "uint8"},
    {"name": "token", "type": "address"},
    {"name": "amount", "type": "uint256"},
    {"name": "targetCompletion", "type": "uint256"},
    {"name": "breachPolicy", "type": "uint8"},
    {"name": "adapter", "type": "address"},
    {"name": "commitmentHash", "type": "bytes32"},
    {"name": "nonce", "type": "uint256"},
]

PROMISE_COMPLETION_TYPE = [
    {"name": "promiseId", "type": "uint256"},
    {"name": "commitmentHash", "type": "bytes32"},
    {"name": "nonce", "type": "uint256"},
]


@pytest.fixture
def admin():
    return accounts[0]


@pytest.fixture
def oracle():
    return accounts[3]


@pytest.fixture
def treasury():
    return accounts[4]


@pytest.fixture
def creator():
    return accounts[1]


@pytest.fixture
def counterparty():
    return accounts[2]


@pytest.fixture
def promise_contract(admin, oracle, treasury):
    contract = ProofOfPromise.deploy({"from": admin})
    contract.initialize(
        admin,
        oracle,
        treasury,
        DEFAULT_DELAY,
        DEFAULT_DELAY,
        {"from": admin},
    )
    return contract


def sign_promise_intent(
    contract,
    signer,
    creator_addr,
    counterparty_addr,
    witness_addr,
    asset_type,
    token_addr,
    amount,
    target_completion,
    breach_policy,
    adapter,
    commitment_hash,
    nonce,
):
    typed_data = {
        "types": {
            "EIP712Domain": EIP712_DOMAIN_TYPE,
            "PromiseIntent": PROMISE_INTENT_TYPE,
        },
        "primaryType": "PromiseIntent",
        "domain": {
            "name": "ProofOfPromise",
            "version": "1",
            "chainId": chain.id,
            "verifyingContract": contract.address,
        },
        "message": {
            "creator": creator_addr,
            "counterparty": counterparty_addr,
            "witness": witness_addr,
            "assetType": asset_type,
            "token": token_addr,
            "amount": amount,
            "targetCompletion": target_completion,
            "breachPolicy": breach_policy,
            "adapter": adapter,
            "commitmentHash": HexBytes(commitment_hash).hex(),
            "nonce": nonce,
        },
    }
    signable = encode_structured_data(typed_data)
    return signer.sign_message(signable).signature


def sign_completion(contract, signer, promise_id, commitment_hash, nonce):
    typed_data = {
        "types": {
            "EIP712Domain": EIP712_DOMAIN_TYPE,
            "PromiseCompletion": PROMISE_COMPLETION_TYPE,
        },
        "primaryType": "PromiseCompletion",
        "domain": {
            "name": "ProofOfPromise",
            "version": "1",
            "chainId": chain.id,
            "verifyingContract": contract.address,
        },
        "message": {
            "promiseId": promise_id,
            "commitmentHash": HexBytes(commitment_hash).hex(),
            "nonce": nonce,
        },
    }
    signable = encode_structured_data(typed_data)
    return signer.sign_message(signable).signature


def create_native_promise(contract, creator, counterparty, breach_policy, value):
    target = chain.time() + ONE_WEEK
    commitment = web3.keccak(text="proof-of-promise")
    counterparty_nonce = contract.nonces(counterparty)

    signature = sign_promise_intent(
        contract,
        counterparty,
        creator.address,
        counterparty.address,
        ZERO_ADDRESS,
        0,
        ZERO_ADDRESS,
        value,
        target,
        breach_policy,
        ZERO_ADDRESS,
        commitment,
        counterparty_nonce,
    )

    params = (
        counterparty.address,
        ZERO_ADDRESS,
        0,
        ZERO_ADDRESS,
        value,
        target,
        breach_policy,
        ZERO_ADDRESS,
        commitment,
        counterparty_nonce,
        0,
        signature,
        b"",
    )

    tx = contract.createPromise(params, {"from": creator, "value": value})
    promise_id = tx.events["PromiseCreated"]["promiseId"]
    return promise_id, commitment, target


def test_create_promise_native(promise_contract, creator, counterparty):
    amount = web3.toWei("0.1", "ether")
    promise_id, commitment, target = create_native_promise(
        promise_contract,
        creator,
        counterparty,
        breach_policy=0,
        value=amount,
    )

    stored = promise_contract.getPromise(promise_id)
    assert stored[0] == creator
    assert stored[1] == counterparty
    assert stored[3] == 0  # AssetType.Native
    assert stored[4] == 0  # BreachPolicy.DelayRelease
    assert stored[8] == commitment
    assert stored[9] == amount
    assert stored[11] == target


def test_confirm_completion_returns_funds(promise_contract, creator, counterparty):
    amount = web3.toWei("0.05", "ether")
    promise_id, commitment, _ = create_native_promise(
        promise_contract,
        creator,
        counterparty,
        breach_policy=0,
        value=amount,
    )

    completion_nonce = promise_contract.nonces(counterparty)
    signature = sign_completion(
        promise_contract,
        counterparty,
        promise_id,
        commitment,
        completion_nonce,
    )

    tx = promise_contract.confirmCompletion(
        promise_id,
        counterparty.address,
        completion_nonce,
        signature,
        {"from": creator},
    )

    stored = promise_contract.getPromise(promise_id)
    assert stored[5] == 3  # Status.Closed
    assert stored[9] == 0
    assert promise_contract.balance() == 0
    assert "PromiseCompleted" in tx.events
    assert promise_contract.nonces(counterparty) == completion_nonce + 1


def test_delay_release_breach_and_claim(promise_contract, creator, counterparty):
    amount = web3.toWei("0.02", "ether")
    promise_id, commitment, _ = create_native_promise(
        promise_contract,
        creator,
        counterparty,
        breach_policy=0,
        value=amount,
    )

    chain.sleep(ONE_WEEK + 1)
    chain.mine()

    promise_contract.declareBreach(promise_id, {"from": accounts[5]})

    stored_after_breach = promise_contract.getPromise(promise_id)
    assert stored_after_breach[5] == 2  # Status.Breached
    assert stored_after_breach[14] == stored_after_breach[13] + DEFAULT_DELAY

    chain.sleep(DEFAULT_DELAY)
    chain.mine()

    promise_contract.claimAfterDelay(promise_id, {"from": creator})

    stored = promise_contract.getPromise(promise_id)
    assert stored[5] == 3
    assert stored[9] == 0
    assert promise_contract.balance() == 0


def test_breach_burn_policy(promise_contract, creator, counterparty):
    amount = web3.toWei("0.015", "ether")
    promise_id, _, _ = create_native_promise(
        promise_contract,
        creator,
        counterparty,
        breach_policy=1,
        value=amount,
    )

    chain.sleep(ONE_WEEK + 1)
    chain.mine()

    tx = promise_contract.declareBreach(promise_id, {"from": creator})

    stored = promise_contract.getPromise(promise_id)
    assert stored[5] == 3  # Status.Closed immediately
    assert stored[9] == 0
    assert promise_contract.balance() == 0
    assert "FundsBurned" in tx.events


def test_breach_donate_policy(promise_contract, creator, counterparty, treasury):
    amount = web3.toWei("0.03", "ether")
    treasury_start = treasury.balance()

    promise_id, _, _ = create_native_promise(
        promise_contract,
        creator,
        counterparty,
        breach_policy=2,
        value=amount,
    )

    chain.sleep(ONE_WEEK + 1)
    chain.mine()

    promise_contract.declareBreach(promise_id, {"from": creator})

    stored = promise_contract.getPromise(promise_id)
    assert stored[5] == 3
    assert stored[9] == 0
    assert promise_contract.balance() == 0
    assert treasury.balance() == treasury_start + amount


def test_create_with_bad_nonce_reverts(promise_contract, creator, counterparty):
    amount = web3.toWei("0.01", "ether")
    target = chain.time() + ONE_WEEK
    commitment = web3.keccak(text="bad-nonce")
    wrong_nonce = 5

    signature = sign_promise_intent(
        promise_contract,
        counterparty,
        creator.address,
        counterparty.address,
        ZERO_ADDRESS,
        0,
        ZERO_ADDRESS,
        amount,
        target,
        0,
        ZERO_ADDRESS,
        commitment,
        wrong_nonce,
    )

    params = (
        counterparty.address,
        ZERO_ADDRESS,
        0,
        ZERO_ADDRESS,
        amount,
        target,
        0,
        ZERO_ADDRESS,
        commitment,
        wrong_nonce,
        0,
        signature,
        b"",
    )

    with reverts("nonce mismatch"):
        promise_contract.createPromise(params, {"from": creator, "value": amount})