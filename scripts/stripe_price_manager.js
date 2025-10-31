const fs = require('fs');
const path = require('path');
const https = require('https');

const STRIPE_API_URL = 'https://api.stripe.com/v1/prices';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const OUTPUT_PATH = path.resolve(__dirname, '..', 'stripe-prices.json');

const ZERO_DECIMAL_CURRENCIES = new Set([
    'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

function ensureStripeSecret() {
    if (!STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY env var must be set before calling Stripe.');
    }
}

function parseArgs(argv) {
    const result = { command: null, extras: [], dryRun: false };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--dry-run') {
            result.dryRun = true;
            continue;
        }
        if (token.startsWith('--')) {
            const key = token.slice(2);
            const value = argv[index + 1];
            if (typeof value === 'undefined' || value.startsWith('--')) {
                throw new Error(`Missing value for --${key}`);
            }
            result[key] = value;
            index += 1;
            continue;
        }

        if (!result.command) {
            result.command = token;
        } else {
            result.extras.push(token);
        }
    }

    return result;
}

function readRegistry() {
    if (!fs.existsSync(OUTPUT_PATH)) {
        return { prices: [] };
    }

    const raw = fs.readFileSync(OUTPUT_PATH, 'utf8');
    if (!raw.trim()) {
        return { prices: [] };
    }

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return { prices: [] };
        }
        if (!Array.isArray(parsed.prices)) {
            parsed.prices = [];
        }
        return parsed;
    } catch (error) {
        throw new Error(`Failed to parse ${OUTPUT_PATH}: ${error.message}`);
    }
}

function persistRegistry(registry) {
    const payload = { ...registry, prices: registry.prices || [] };
    payload.generated_at = new Date().toISOString();
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', { encoding: 'utf8' });
}

function computeDecimalPlaces(price) {
    if (price && typeof price.unit_amount_decimal === 'string') {
        const parts = price.unit_amount_decimal.split('.');
        if (parts.length === 2) {
            return parts[1].length;
        }
    }
    const currency = price && price.currency ? price.currency.toUpperCase() : 'USD';
    if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
        return 0;
    }
    return 2;
}

function buildRecord({ price, handle, productId, nickname }) {
    const decimalPlaces = computeDecimalPlaces(price);
    const divisor = Math.pow(10, decimalPlaces);
    const minorUnitAmount = typeof price.unit_amount === 'number' ? price.unit_amount : Number(price.unit_amount);
    const decimalAmount = Number.isFinite(minorUnitAmount)
        ? (decimalPlaces ? (minorUnitAmount / divisor).toFixed(decimalPlaces) : String(minorUnitAmount))
        : null;
    const record = {
        handle,
        stripe_price_id: price.id,
        currency: price.currency,
        unit_amount: minorUnitAmount,
        unit_amount_decimal: decimalAmount,
        decimal_places: decimalPlaces,
        updated_datetime: new Date().toISOString()
    };

    const resolvedProductId = productId || (price.product && typeof price.product === 'object' ? price.product.id : price.product);
    if (resolvedProductId) {
        record.product_id = resolvedProductId;
    }
    if (nickname || price.nickname) {
        record.nickname = nickname || price.nickname;
    }

    return record;
}

function writeRecordToDisk(record) {
    const registry = readRegistry();
    const existingIndex = registry.prices.findIndex(entry => entry.handle === record.handle);
    if (existingIndex >= 0) {
        registry.prices[existingIndex] = record;
    } else {
        registry.prices.push(record);
    }
    persistRegistry(registry);
    return record;
}

function createStripePriceRequestBody({ productId, currency, unitAmount, nickname }) {
    const params = new URLSearchParams();
    params.append('product', productId);
    params.append('unit_amount', String(unitAmount));
    params.append('currency', currency.toLowerCase());
    if (nickname) {
        params.append('nickname', nickname);
    }
    return params.toString();
}

function postToStripe(body) {
    return new Promise((resolve, reject) => {
        const request = https.request(STRIPE_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            }
        }, response => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                const payload = Buffer.concat(chunks).toString('utf8');
                if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
                    try {
                        resolve(JSON.parse(payload));
                    } catch (error) {
                        reject(new Error(`Stripe payload parse error: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Stripe error ${response.statusCode}: ${payload}`));
                }
            });
        });
        request.on('error', reject);
        request.write(body);
        request.end();
    });
}

async function createStripePriceTag({ productId, currency, unitAmount, nickname }) {
    ensureStripeSecret();
    const body = createStripePriceRequestBody({ productId, currency, unitAmount, nickname });
    return postToStripe(body);
}

async function upsertStripePriceRecord({ handle, productId, currency, unitAmount, nickname, dryRun }) {
    if (!handle) {
        throw new Error('handle is required');
    }
    if (!productId) {
        throw new Error('product (Stripe product id) is required');
    }
    if (!currency) {
        throw new Error('currency is required');
    }
    if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
        throw new Error('amount must be a positive integer representing minor units.');
    }

    let pricePayload;
    if (dryRun) {
        pricePayload = {
            id: 'price_dry_run',
            product: productId,
            currency: currency.toLowerCase(),
            unit_amount: unitAmount,
            unit_amount_decimal: String(unitAmount),
            nickname: nickname || null
        };
    } else {
        pricePayload = await createStripePriceTag({ productId, currency, unitAmount, nickname });
    }

    const record = buildRecord({ price: pricePayload, handle, productId, nickname });
    return writeRecordToDisk(record);
}

function printHelp() {
    console.log(`Usage: node stripe_price_manager.js [create|list] [options]\n\nCommands:\n  create   Create a Stripe price and store the tag mapping.\n  list     Show the current stripe-prices.json contents.\n\nOptions for create:\n  --handle <slug>      Identifier that matches shop.js handle.\n  --product <id>       Stripe product id to attach the price to.\n  --amount <integer>   Amount in minor units (e.g. cents).\n  --currency <code>    ISO currency code (e.g. usd).\n  --nickname <label>   Optional nickname visible in Stripe dashboard.\n  --dry-run            Skip the Stripe API call and only update local registry.\n`);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const command = options.command || 'create';

    if (command === 'list') {
        const registry = readRegistry();
        console.log(JSON.stringify(registry, null, 2));
        return;
    }

    if (command === 'help' || options.help) {
        printHelp();
        return;
    }

    if (command !== 'create') {
        throw new Error(`Unknown command: ${command}`);
    }

    const handle = options.handle;
    const productId = options.product;
    const currency = options.currency ? options.currency.toLowerCase() : null;
    const unitAmount = options.amount ? Number(options.amount) : NaN;
    const nickname = options.nickname || null;

    if (!handle || !productId || !currency || !Number.isInteger(unitAmount)) {
        throw new Error('create command requires --handle, --product, --amount, and --currency arguments.');
    }

    const record = await upsertStripePriceRecord({
        handle,
        productId,
        currency,
        unitAmount,
        nickname,
        dryRun: options.dry_run || options.dryRun
    });

    console.log(JSON.stringify(record, null, 2));
}

module.exports = {
    createStripePriceTag,
    upsertStripePriceRecord,
    readRegistry,
    buildRecord
};

if (require.main === module) {
    main().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
