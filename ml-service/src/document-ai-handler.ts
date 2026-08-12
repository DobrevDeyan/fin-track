import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as fs from 'fs';
import * as path from 'path';
import { logProcessingAttempt, logProcessingSuccess, logProcessingError } from './logging';

// Load environment variables
const projectId = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'eu';
const processorId = process.env.GCP_PROCESSOR_ID;

// Interface for extracted receipt data
export interface ExtractedReceiptData {
    merchant: string;
    amount: number;
    /** ISO-4217 currency code detected on the receipt (e.g. "EUR", "USD"), if any.
     * The amount is expressed in THIS currency, not necessarily the user's display
     * currency — the client must convert accordingly (review RCP-1). */
    currency?: string;
    date: string;
    items: string[];
    rawText: string;
    confidence: number;
    rawEntities: Record<string, string>;
}

// Sanity cap to reject absurd OCR amounts (e.g. a misread barcode/order number).
const MAX_PARSED_AMOUNT = 100_000_000;

// Initialize the client with credentials from environment
let client: DocumentProcessorServiceClient;

function getClient(): DocumentProcessorServiceClient {
    if (!client) {
        // Set the API endpoint based on location
        const apiEndpoint = location === 'eu'
            ? 'eu-documentai.googleapis.com'
            : 'us-documentai.googleapis.com';

        const clientOptions: { apiEndpoint: string; keyFilename?: string } = { apiEndpoint };

        // Use key file for local development if provided, otherwise use ADC
        // On Cloud Run, ADC automatically uses the service account attached to the service
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (credentialsPath) {
            const absolutePath = path.isAbsolute(credentialsPath)
                ? credentialsPath
                : path.resolve(process.cwd(), credentialsPath);

            if (fs.existsSync(absolutePath)) {
                clientOptions.keyFilename = absolutePath;
                console.log('Using service account key file for authentication');
            } else {
                console.warn(`Key file not found at ${absolutePath}, falling back to ADC`);
            }
        } else {
            console.log('Using Application Default Credentials (ADC)');
        }

        client = new DocumentProcessorServiceClient(clientOptions);
        console.log('Document AI client configured with endpoint:', apiEndpoint);
    }
    return client;
}

/**
 * Parse an OCR amount string to a number.
 *
 * Handles currency symbols/codes, both thousands-separator conventions
 * (US `1,234.56` and EU `1.234,56`), bare integers, and OCR junk. Returns a
 * non-negative, finite value (receipt totals are positive expense amounts) and
 * 0 for anything unparseable or absurdly large (review RCP-6).
 */
export function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    // Strip currency symbols, ISO codes / words, and any remaining non-numeric
    // OCR junk (letters like the "S"/"l" misread for 5/1), keeping only digits,
    // separators and a leading sign.
    let cleaned = amountStr
        .replace(/[€$£¥₹₽]/g, '')
        .replace(/\b(?:EUR|USD|GBP|JPY|BGN|RON|лв|lv|лева)\b/gi, '')
        .replace(/[^\d.,-]/g, '')
        .trim();

    if (!cleaned) return 0;

    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
        // Whichever separator appears LAST is the decimal separator.
        if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
            // European: dots are thousands, comma is decimal (1.234,56)
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            // US/UK: commas are thousands, dot is decimal (1,234.56)
            cleaned = cleaned.replace(/,/g, '');
        }
    } else if (hasComma) {
        // Only comma: thousands grouping (1,234 / 1,234,567) vs decimal comma (123,45).
        if (/^-?\d{1,3}(,\d{3})+$/.test(cleaned)) {
            cleaned = cleaned.replace(/,/g, '');
        } else {
            cleaned = cleaned.replace(',', '.');
        }
    } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
        // Only dots, all groups of three (1.234.567) -> EU thousands grouping.
        cleaned = cleaned.replace(/\./g, '');
    }

    const amount = parseFloat(cleaned);
    if (!isFinite(amount)) return 0;

    const abs = Math.abs(amount); // expense totals are positive; user can flip if needed
    if (abs > MAX_PARSED_AMOUNT) return 0;
    return abs;
}

const MONTH_INDEX: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/** Build a YYYY-MM-DD string, validating the calendar date in UTC (rejects e.g.
 * Feb 30) without any timezone shift. Returns null if the date is invalid. */
function buildISODate(year: number, month: number, day: number): string | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
        dt.getUTCFullYear() !== year ||
        dt.getUTCMonth() !== month - 1 ||
        dt.getUTCDate() !== day
    ) {
        return null;
    }
    return `${year}-${pad2(month)}-${pad2(day)}`;
}

function todayISODate(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

/**
 * Parse an OCR date string to a YYYY-MM-DD string.
 *
 * Builds the date from the matched fields (instead of handing the raw string to
 * `new Date()`, which silently mis-parses DD/MM receipts and falls back to today
 * — review RCP-2). The processor runs in the EU region, so ambiguous numeric
 * dates (both fields <= 12) are interpreted as DD/MM. Falls back to today only
 * when nothing parses.
 */
export function parseDate(dateStr: string): string {
    if (!dateStr) return todayISODate();
    const s = dateStr.trim();

    // ISO-ish: YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
    let m = s.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (m) {
        const iso = buildISODate(+m[1], +m[2], +m[3]);
        if (iso) return iso;
    }

    // Numeric DD/MM/YYYY or MM/DD/YYYY (2- or 4-digit year)
    m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) {
        const a = +m[1];
        const b = +m[2];
        let year = +m[3];
        if (year < 100) year += year < 70 ? 2000 : 1900;

        let day: number;
        let month: number;
        if (a > 12 && b <= 12) {
            day = a; month = b;            // unambiguous DD/MM
        } else if (b > 12 && a <= 12) {
            day = b; month = a;            // unambiguous MM/DD
        } else {
            day = a; month = b;            // ambiguous -> DD/MM (EU processor)
        }
        const iso = buildISODate(year, month, day);
        if (iso) return iso;
    }

    // DD MMM YYYY  (e.g. "29 Jun 2026", "29 June 2026")
    m = s.match(/(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/);
    if (m) {
        const mon = MONTH_INDEX[m[2].slice(0, 3).toLowerCase()];
        if (mon) {
            const iso = buildISODate(+m[3], mon, +m[1]);
            if (iso) return iso;
        }
    }

    // MMM DD, YYYY  (e.g. "Jun 29, 2026")
    m = s.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) {
        const mon = MONTH_INDEX[m[1].slice(0, 3).toLowerCase()];
        if (mon) {
            const iso = buildISODate(+m[3], mon, +m[2]);
            if (iso) return iso;
        }
    }

    return todayISODate();
}

/**
 * Normalize a raw currency string (symbol, ISO code or word) to an ISO-4217 code.
 */
export function normalizeCurrency(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const s = raw.trim().toUpperCase();
    if (s.includes('€') || /\bEUR\b/.test(s)) return 'EUR';
    if (s.includes('$') || /\bUSD\b/.test(s)) return 'USD';
    if (s.includes('£') || /\bGBP\b/.test(s)) return 'GBP';
    if (/\bBGN\b/.test(s) || /ЛВ/.test(s) || /\bLV\b/.test(s)) return 'BGN';
    const code = s.match(/\b([A-Z]{3})\b/);
    return code ? code[1] : undefined;
}

/**
 * Extract the receipt's printed currency from entities or an amount field's symbol.
 */
function extractCurrency(entities: Record<string, string>): string | undefined {
    for (const key of ['currency', 'currency_code']) {
        const c = normalizeCurrency(entities[key]);
        if (c) return c;
    }
    for (const key of ['total_amount', 'grand_total', 'total_due', 'amount_due', 'total', 'net_amount']) {
        const c = normalizeCurrency(entities[key]);
        if (c) return c;
    }
    return undefined;
}

/**
 * Extract merchant name from entities
 */
function extractMerchant(entities: Record<string, string>): string {
    // Common entity type names for merchant/supplier
    const merchantKeys = [
        'supplier_name',
        'vendor_name',
        'merchant_name',
        'store_name',
        'company_name',
        'receiver_name',
        'payee',
    ];

    for (const key of merchantKeys) {
        if (entities[key]) {
            return entities[key].trim();
        }
    }

    return 'Unknown Merchant';
}

/**
 * Extract the receipt total from entities.
 *
 * Prefers true grand-total keys; only falls back to subtotal/net (pre-tax) when no
 * labeled total exists, so a pre-tax subtotal never wins over the real total
 * (review RCP-7). Returns the chosen entity key too, so the caller can report the
 * amount's own confidence rather than a whole-document average (review RCP-15).
 */
function extractAmount(entities: Record<string, string>): { value: number; key: string | null } {
    const totalKeys = ['total_amount', 'grand_total', 'total_due', 'amount_due', 'total'];
    const fallbackKeys = ['net_amount', 'subtotal'];

    for (const key of [...totalKeys, ...fallbackKeys]) {
        if (entities[key]) {
            const amount = parseAmount(entities[key]);
            if (amount > 0) return { value: amount, key };
        }
    }

    return { value: 0, key: null };
}

/**
 * Extract date from entities
 */
function extractDate(entities: Record<string, string>): string {
    // Common entity type names for date
    const dateKeys = [
        'receipt_date',
        'invoice_date',
        'transaction_date',
        'date',
        'purchase_date',
        'issue_date',
    ];

    for (const key of dateKeys) {
        if (entities[key]) {
            return parseDate(entities[key]);
        }
    }

    return new Date().toISOString().split('T')[0];
}

/**
 * Extract line items from entities
 */
function extractItems(entities: Record<string, string>): string[] {
    const items: string[] = [];

    // Look for line item related entities
    for (const [key, value] of Object.entries(entities)) {
        if (key.includes('line_item') || key.includes('item_description') || key.includes('product')) {
            if (value && value.trim()) {
                items.push(value.trim());
            }
        }
    }

    return items;
}

/**
 * Processes a local file using the Document AI API.
 * @param filePath The path to the local file.
 * @param mimeType The MIME type of the file.
 * @param requestId Optional unique ID for tracing the request.
 * @param userId Optional user ID for context.
 * @returns Extracted receipt data structured for the frontend
 */
export async function processDocument(
    filePath: string, 
    mimeType: string,
    requestId?: string,
    userId?: string
): Promise<ExtractedReceiptData> {
    if (!projectId || !processorId) {
        throw new Error('Missing GCP_PROJECT_ID or GCP_PROCESSOR_ID environment variables');
    }

    const docClient = getClient();
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    console.log(`Processing document [${requestId || 'no-id'}]:`);
    console.log('  - Processor path:', name);
    console.log('  - File path:', filePath);
    console.log('  - MIME type:', mimeType);

    // Read the file content
    const imageContent = fs.readFileSync(filePath);
    console.log('  - File size:', imageContent.length, 'bytes');

    const request = {
        name,
        rawDocument: {
            content: Buffer.from(imageContent).toString('base64'),
            mimeType: mimeType,
        },
    };

    const startTime = Date.now();
    const logId = await logProcessingAttempt(filePath, mimeType, requestId, userId);

    try {
        const [result] = await docClient.processDocument(request);
        const document = result.document;

        if (!document) {
            throw new Error('No document found in the response');
        }

        // Extract all entities into a flat structure (+ per-entity confidence)
        const rawEntities: Record<string, string> = {};
        const entityConfidence: Record<string, number> = {};
        let totalConfidence = 0;
        let entityCount = 0;

        if (document.entities) {
            for (const entity of document.entities) {
                if (entity.type && entity.mentionText) {
                    rawEntities[entity.type] = entity.mentionText;
                    if (typeof entity.confidence === 'number') {
                        entityConfidence[entity.type] = entity.confidence;
                        totalConfidence += entity.confidence;
                        entityCount++;
                    }
                }

                // Handle nested properties
                if (entity.properties) {
                    for (const prop of entity.properties) {
                        if (prop.type && prop.mentionText) {
                            rawEntities[prop.type] = prop.mentionText;
                            if (typeof prop.confidence === 'number') {
                                entityConfidence[prop.type] = prop.confidence;
                                totalConfidence += prop.confidence;
                                entityCount++;
                            }
                        }
                    }
                }
            }
        }

        // Whole-document average, used as a fallback signal.
        const avgConfidence = entityCount > 0 ? totalConfidence / entityCount : 0;

        // Report the AMOUNT's own confidence when available — the low-confidence
        // warning in the UI is about the amount, not unrelated fields (RCP-15).
        const amount = extractAmount(rawEntities);
        const amountConfidence = amount.key != null && entityConfidence[amount.key] != null
            ? entityConfidence[amount.key]
            : avgConfidence;

        // Build structured response
        const extractedData: ExtractedReceiptData = {
            merchant: extractMerchant(rawEntities),
            amount: amount.value,
            currency: extractCurrency(rawEntities),
            date: extractDate(rawEntities),
            items: extractItems(rawEntities),
            rawText: document.text || '',
            confidence: Math.round(amountConfidence * 100) / 100,
            rawEntities,
        };

        const processingTime = Date.now() - startTime;
        await logProcessingSuccess(logId, {
            merchant: extractedData.merchant,
            amount: extractedData.amount,
            date: extractedData.date,
            items: extractedData.items,
            rawText: extractedData.rawText,
            confidence: extractedData.confidence,
        }, processingTime);

        return extractedData;

    } catch (error: any) {
        const processingTime = Date.now() - startTime;
        await logProcessingError(logId, error.message || 'Unknown error', processingTime);

        console.error('Error during Document AI processing:', error);

        // Log detailed error info
        if (error.statusDetails) {
            console.error('Status details:', JSON.stringify(error.statusDetails, null, 2));
        }
        if (error.metadata) {
            try {
                const badRequest = error.metadata.get('google.rpc.badrequest-bin');
                if (badRequest) {
                    console.error('Bad request details:', badRequest);
                }
            } catch (e) {
                // ignore
            }
        }

        throw new Error(`Failed to process document: ${error.message}`);
    }
}
