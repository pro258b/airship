(function () {
    'use strict';

    if (typeof window === 'undefined') {
        return;
    }

    if (!window.ethers) {
        const fallback = document.getElementById('pop-status');
        if (fallback) {
            fallback.textContent = 'ethers.js failed to load. Check the CDN script tag.';
            fallback.setAttribute('data-tone', 'error');
        }
        return;
    }

    const abi = [
        'function defaultDelaySeconds() view returns (uint256)',
        'function maxDelaySeconds() view returns (uint256)',
        'function treasury() view returns (address)',
        'function nextPromiseId() view returns (uint256)',
        'function nonces(address) view returns (uint256)',
        'function getPromise(uint256) view returns (tuple(address,address,address,uint8,uint8,uint8,address,address,bytes32,uint256,uint256,uint256,uint256,uint256,uint256))',
        'function createPromise((address,address,uint8,address,uint256,uint256,uint8,address,bytes32,uint256,uint256,bytes,bytes)) payable returns (uint256)',
        'function confirmCompletion(uint256,address,uint256,bytes)',
        'function declareBreach(uint256)',
        'function claimAfterDelay(uint256)'
    ];

    const ZERO_ADDRESS = ethers.constants.AddressZero;
    const state = {
        provider: null,
        signer: null,
        contract: null
    };

    const statusEl = document.getElementById('pop-status');
    const walletEl = document.getElementById('pop-wallet-address');
    const contractStatusEl = document.getElementById('pop-contract-status');
    const configTextarea = document.getElementById('pop-contract-info');
    const readOutputEl = document.getElementById('pop-read-output');

    function formatError(error) {
        if (!error) {
            return 'Unknown error';
        }
        const nested = error.error || error.data;
        const message = nested && nested.message ? nested.message : error.reason || error.message || String(error);
        return message.replace(/^Error:?\s*/i, '');
    }

    function setStatus(message, tone) {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = message;
        if (tone) {
            statusEl.setAttribute('data-tone', tone);
        } else {
            statusEl.setAttribute('data-tone', 'info');
        }
    }

    function setInlineStatus(id, message, tone) {
        const el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.textContent = message;
        if (tone) {
            el.setAttribute('data-tone', tone);
        } else {
            el.removeAttribute('data-tone');
        }
    }

    function ensureSigner() {
        if (!state.signer) {
            throw new Error('Connect a wallet first.');
        }
        return state.signer;
    }

    function ensureContract() {
        if (!state.contract) {
            throw new Error('Load the ProofOfPromise contract first.');
        }
        return state.contract;
    }

    function readValue(id) {
        const el = document.getElementById(id);
        return el ? el.value || '' : '';
    }

    function parseAddress(rawValue, allowZero, label) {
        const value = (rawValue || '').trim();
        if (!value) {
            if (allowZero) {
                return ZERO_ADDRESS;
            }
            throw new Error(label + ' is required.');
        }
        if (/^0x0*$/i.test(value)) {
            if (allowZero) {
                return ZERO_ADDRESS;
            }
            throw new Error(label + ' is required.');
        }
        if (!ethers.utils.isAddress(value)) {
            throw new Error(label + ' is invalid.');
        }
        return ethers.utils.getAddress(value);
    }

    function parseBytes32(rawValue, label) {
        const value = (rawValue || '').trim();
        if (!value) {
            throw new Error(label + ' is required.');
        }
        const normalized = value.startsWith('0x') ? value : '0x' + value;
        if (!ethers.utils.isHexString(normalized, 32)) {
            throw new Error(label + ' must be 32-byte hex.');
        }
        return normalized;
    }

    function parseSignature(rawValue, required) {
        const value = (rawValue || '').trim();
        if (!value) {
            if (required) {
                throw new Error('Signature is required.');
            }
            return '0x';
        }
        const normalized = value.startsWith('0x') ? value : '0x' + value;
        if (!ethers.utils.isHexString(normalized)) {
            throw new Error('Signature must be a hex string.');
        }
        return normalized;
    }

    function parseUint(rawValue, label, allowEmpty) {
        const value = (rawValue || '').trim();
        if (!value) {
            if (allowEmpty) {
                return null;
            }
            throw new Error(label + ' is required.');
        }
        if (!/^\d+$/.test(value)) {
            throw new Error(label + ' must be an integer.');
        }
        return ethers.BigNumber.from(value);
    }

    function parseTimestamp(rawValue, label) {
        const value = (rawValue || '').trim();
        if (!value) {
            throw new Error(label + ' is required.');
        }
        const ms = Date.parse(value);
        if (Number.isNaN(ms)) {
            throw new Error(label + ' is invalid.');
        }
        return Math.floor(ms / 1000);
    }

    function parseAmount(rawAmount, decimalsRaw) {
        const amount = (rawAmount || '').trim();
        if (!amount) {
            throw new Error('Amount is required.');
        }
        const decimals = parseInt((decimalsRaw || '18').toString(), 10);
        if (Number.isNaN(decimals) || decimals < 0) {
            throw new Error('Decimals must be zero or positive.');
        }
        return ethers.utils.parseUnits(amount, decimals);
    }

    function formatPromise(promise) {
        const assetNames = ['Native', 'ERC20'];
        const policyNames = ['DelayRelease', 'Burn', 'Donate'];
        const statusNames = ['Pending', 'Completed', 'Breached', 'Closed'];
        return JSON.stringify({
            creator: promise[0],
            counterparty: promise[1],
            witness: promise[2],
            assetType: promise[3] + ' (' + (assetNames[promise[3]] || 'Unknown') + ')',
            policy: promise[4] + ' (' + (policyNames[promise[4]] || 'Unknown') + ')',
            status: promise[5] + ' (' + (statusNames[promise[5]] || 'Unknown') + ')',
            tokenAddress: promise[6],
            adapter: promise[7],
            commitmentHash: promise[8],
            principal: promise[9].toString(),
            yieldShares: promise[10].toString(),
            targetCompletion: promise[11].toString(),
            createdAt: promise[12].toString(),
            breachAt: promise[13].toString(),
            breachUnlock: promise[14].toString()
        }, null, 2);
    }

    async function connectWallet() {
        try {
            if (!window.ethereum) {
                throw new Error('No injected wallet detected. Install MetaMask or a compatible provider.');
            }
            state.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            await state.provider.send('eth_requestAccounts', []);
            state.signer = state.provider.getSigner();
            const address = await state.signer.getAddress();
            walletEl.textContent = 'Connected: ' + address;
            setStatus('Wallet connected.', 'success');
        } catch (error) {
            walletEl.textContent = '';
            setStatus('Wallet connection failed: ' + formatError(error), 'error');
        }
    }

    async function loadContract() {
        try {
            const signer = ensureSigner();
            const address = parseAddress(readValue('pop-contract-address'), false, 'Contract address');
            state.contract = new ethers.Contract(address, abi, signer);
            const network = await state.provider.getNetwork();
            contractStatusEl.textContent = 'Loaded @ ' + address + ' (chain ' + network.chainId + ')';
            setStatus('Contract ready.', 'success');
        } catch (error) {
            state.contract = null;
            contractStatusEl.textContent = '';
            setStatus('Contract load failed: ' + formatError(error), 'error');
        }
    }

    async function refreshConfig() {
        try {
            const contract = ensureContract();
            const [defaultDelay, maxDelay, treasury, nextId] = await Promise.all([
                contract.defaultDelaySeconds(),
                contract.maxDelaySeconds(),
                contract.treasury(),
                contract.nextPromiseId()
            ]);
            const snapshot = [
                'defaultDelaySeconds: ' + defaultDelay.toString(),
                'maxDelaySeconds: ' + maxDelay.toString(),
                'treasury: ' + treasury,
                'nextPromiseId: ' + nextId.toString()
            ].join('\n');
            configTextarea.value = snapshot;
            setStatus('Configuration refreshed.', 'success');
        } catch (error) {
            configTextarea.value = '';
            setStatus('Config refresh failed: ' + formatError(error), 'error');
        }
    }

    function buildCreateParams() {
        const assetType = parseInt(readValue('pop-create-asset-type'), 10);
        const amount = parseAmount(readValue('pop-create-amount'), readValue('pop-create-decimals'));
        const targetTs = parseTimestamp(readValue('pop-create-target'), 'Target completion');
        const counterparty = parseAddress(readValue('pop-create-counterparty'), true, 'Counterparty address');
        const witness = parseAddress(readValue('pop-create-witness'), true, 'Witness address');
        const tokenAddress = assetType === 0 ? ZERO_ADDRESS : parseAddress(readValue('pop-create-token'), false, 'Token address');
        const adapter = parseAddress(readValue('pop-create-adapter'), true, 'Adapter address');
        const commitmentHash = parseBytes32(readValue('pop-create-commitment'), 'Commitment hash');
        const counterpartyNonce = parseUint(readValue('pop-create-counterparty-nonce'), 'Counterparty nonce', true) || ethers.BigNumber.from(0);
        const witnessNonce = parseUint(readValue('pop-create-witness-nonce'), 'Witness nonce', true) || ethers.BigNumber.from(0);
        const counterpartySig = counterparty === ZERO_ADDRESS ? '0x' : parseSignature(readValue('pop-create-counterparty-sig'), true);
        const witnessSig = witness === ZERO_ADDRESS ? '0x' : parseSignature(readValue('pop-create-witness-sig'), false);
        const policy = parseInt(readValue('pop-create-policy'), 10);

        const params = [
            counterparty,
            witness,
            assetType,
            tokenAddress,
            amount,
            targetTs,
            policy,
            adapter,
            commitmentHash,
            counterpartyNonce,
            witnessNonce,
            counterpartySig,
            witnessSig
        ];

        const overrides = {};
        if (assetType === 0) {
            overrides.value = amount;
        }

        return { params, overrides };
    }

    async function handleCreate(event) {
        event.preventDefault();
        setInlineStatus('pop-create-status', '');
        try {
            const contract = ensureContract();
            const { params, overrides } = buildCreateParams();
            const tx = await contract.createPromise(params, overrides);
            setInlineStatus('pop-create-status', 'Transaction sent. Waiting for confirmation...');
            const receipt = await tx.wait();
            const created = receipt.events && receipt.events.find(function (eventLog) {
                return eventLog.event === 'PromiseCreated';
            });
            if (created && created.args && created.args.promiseId) {
                setInlineStatus('pop-create-status', 'Promise created with id ' + created.args.promiseId.toString(), 'success');
            } else {
                setInlineStatus('pop-create-status', 'Transaction mined. Inspect logs for PromiseCreated.', 'success');
            }
            setStatus('createPromise confirmed.', 'success');
        } catch (error) {
            setInlineStatus('pop-create-status', 'Create failed: ' + formatError(error), 'error');
            setStatus('createPromise failed.', 'error');
        }
    }

    async function handleConfirm(event) {
        event.preventDefault();
        setInlineStatus('pop-confirm-status', '');
        try {
            const contract = ensureContract();
            const promiseId = parseUint(readValue('pop-confirm-id'), 'Promise id');
            const attestor = parseAddress(readValue('pop-confirm-attestor'), true, 'Attestor address');
            const nonce = parseUint(readValue('pop-confirm-nonce'), 'Attestor nonce');
            const signature = parseSignature(readValue('pop-confirm-signature'), attestor !== ZERO_ADDRESS);
            const tx = await contract.confirmCompletion(promiseId, attestor, nonce, signature);
            setInlineStatus('pop-confirm-status', 'Transaction sent. Waiting for confirmation...');
            await tx.wait();
            setInlineStatus('pop-confirm-status', 'Completion confirmed and funds released.', 'success');
            setStatus('confirmCompletion confirmed.', 'success');
        } catch (error) {
            setInlineStatus('pop-confirm-status', 'Confirm failed: ' + formatError(error), 'error');
            setStatus('confirmCompletion failed.', 'error');
        }
    }

    async function handleBreach(event) {
        event.preventDefault();
        setInlineStatus('pop-breach-status', '');
        try {
            const contract = ensureContract();
            const promiseId = parseUint(readValue('pop-breach-id'), 'Promise id');
            const tx = await contract.declareBreach(promiseId);
            setInlineStatus('pop-breach-status', 'Transaction sent. Waiting for confirmation...');
            await tx.wait();
            setInlineStatus('pop-breach-status', 'Breach declared.', 'success');
            setStatus('declareBreach confirmed.', 'success');
        } catch (error) {
            setInlineStatus('pop-breach-status', 'Breach failed: ' + formatError(error), 'error');
            setStatus('declareBreach failed.', 'error');
        }
    }

    async function handleClaim(event) {
        event.preventDefault();
        setInlineStatus('pop-claim-status', '');
        try {
            const contract = ensureContract();
            const promiseId = parseUint(readValue('pop-claim-id'), 'Promise id');
            const tx = await contract.claimAfterDelay(promiseId);
            setInlineStatus('pop-claim-status', 'Transaction sent. Waiting for confirmation...');
            await tx.wait();
            setInlineStatus('pop-claim-status', 'Delayed claim executed.', 'success');
            setStatus('claimAfterDelay confirmed.', 'success');
        } catch (error) {
            setInlineStatus('pop-claim-status', 'Claim failed: ' + formatError(error), 'error');
            setStatus('claimAfterDelay failed.', 'error');
        }
    }

    async function handleReadPromise(event) {
        event.preventDefault();
        try {
            const contract = ensureContract();
            const promiseId = parseUint(readValue('pop-read-id'), 'Promise id');
            const promise = await contract.getPromise(promiseId);
            readOutputEl.value = formatPromise(promise);
            setStatus('Promise data loaded.', 'success');
        } catch (error) {
            readOutputEl.value = 'Read failed: ' + formatError(error);
            setStatus('getPromise failed.', 'error');
        }
    }

    async function handleReadNonce(event) {
        event.preventDefault();
        try {
            const contract = ensureContract();
            const account = parseAddress(readValue('pop-nonce-address'), false, 'Account');
            const nonce = await contract.nonces(account);
            readOutputEl.value = account + ' nonce: ' + nonce.toString();
            setStatus('Nonce fetched.', 'success');
        } catch (error) {
            readOutputEl.value = 'Nonce lookup failed: ' + formatError(error);
            setStatus('nonces lookup failed.', 'error');
        }
    }

    const connectBtn = document.getElementById('pop-connect-wallet');
    const loadBtn = document.getElementById('pop-load-contract');
    const refreshBtn = document.getElementById('pop-refresh-config');
    const createForm = document.getElementById('pop-create-form');
    const confirmForm = document.getElementById('pop-confirm-form');
    const breachForm = document.getElementById('pop-breach-form');
    const claimForm = document.getElementById('pop-claim-form');
    const readForm = document.getElementById('pop-read-form');
    const nonceForm = document.getElementById('pop-nonce-form');

    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }
    if (loadBtn) {
        loadBtn.addEventListener('click', loadContract);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshConfig);
    }
    if (createForm) {
        createForm.addEventListener('submit', handleCreate);
    }
    if (confirmForm) {
        confirmForm.addEventListener('submit', handleConfirm);
    }
    if (breachForm) {
        breachForm.addEventListener('submit', handleBreach);
    }
    if (claimForm) {
        claimForm.addEventListener('submit', handleClaim);
    }
    if (readForm) {
        readForm.addEventListener('submit', handleReadPromise);
    }
    if (nonceForm) {
        nonceForm.addEventListener('submit', handleReadNonce);
    }

    setStatus('Idle', 'info');
})();
