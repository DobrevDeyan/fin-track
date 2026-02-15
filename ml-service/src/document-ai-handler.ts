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
    date: string;
    items: string[];
    rawText: string;
    confidence: number;
    rawEntities: Record<string, string>;
}

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
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    // Remove currency symbols and whitespace
    let cleaned = amountStr.replace(/[€$£¥₹₽]/g, '').trim();

    // Handle European format (1.234,56 -> 1234.56)
    if (cleaned.match(/\d{1,3}(\.\d{3})*,\d{2}$/)) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Handle format with comma as thousands separator (1,234.56)
    else if (cleaned.match(/\d{1,3}(,\d{3})*\.\d{2}$/)) {
        cleaned = cleaned.replace(/,/g, '');
    }
    // Handle simple comma as decimal (123,45)
    else if (cleaned.match(/^\d+,\d{2}$/)) {
        cleaned = cleaned.replace(',', '.');
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Try various date formats
    const datePatterns = [
        // DD/MM/YYYY or DD-MM-YYYY
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
        // YYYY/MM/DD or YYYY-MM-DD
        /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
        // DD MMM YYYY or DD Month YYYY
        /(\d{1,2})\s+(\w+)\s+(\d{4})/,
    ];

    for (const pattern of datePatterns) {
        const match = dateStr.match(pattern);
        if (match) {
            try {
                // Try to create a valid date
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            } catch {
                // Continue to next pattern
            }
        }
    }

    // If parsing fails, return today's date
    return new Date().toISOString().split('T')[0];
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
 * Extract total amount from entities
 */
function extractAmount(entities: Record<string, string>): number {
    // Common entity type names for total amount
    const amountKeys = [
        'total_amount',
        'net_amount',
        'total',
        'amount_due',
        'grand_total',
        'total_due',
        'subtotal',
    ];

    for (const key of amountKeys) {
        if (entities[key]) {
            const amount = parseAmount(entities[key]);
            if (amount > 0) return amount;
        }
    }

    return 0;
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

        // Extract all entities into a flat structure
        const rawEntities: Record<string, string> = {};
        let totalConfidence = 0;
        let entityCount = 0;

        if (document.entities) {
            for (const entity of document.entities) {
                if (entity.type && entity.mentionText) {
                    rawEntities[entity.type] = entity.mentionText;
                    if (entity.confidence) {
                        totalConfidence += entity.confidence;
                        entityCount++;
                    }
                }

                // Handle nested properties
                if (entity.properties) {
                    for (const prop of entity.properties) {
                        if (prop.type && prop.mentionText) {
                            rawEntities[prop.type] = prop.mentionText;
                            if (prop.confidence) {
                                totalConfidence += prop.confidence;
                                entityCount++;
                            }
                        }
                    }
                }
            }
        }

        // Calculate average confidence
        const avgConfidence = entityCount > 0 ? totalConfidence / entityCount : 0;

        // Build structured response
        const extractedData: ExtractedReceiptData = {
            merchant: extractMerchant(rawEntities),
            amount: extractAmount(rawEntities),
            date: extractDate(rawEntities),
            items: extractItems(rawEntities),
            rawText: document.text || '',
            confidence: Math.round(avgConfidence * 100) / 100,
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
