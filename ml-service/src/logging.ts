
import * as admin from 'firebase-admin';

// Track whether Firebase is available for logging
let isFirebaseAvailable = false;
let db: admin.firestore.Firestore | null = null;
const LOGS_COLLECTION = 'document_processing_logs';

// Initialize Firebase Admin with error handling
try {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    db = admin.firestore();
    isFirebaseAvailable = true;
} catch (error: any) {
    console.warn('⚠️ Firebase Admin initialization failed - Firestore logging disabled');
    console.warn('   Error:', error.message);
    console.warn('   Document processing will continue, but logs will only appear in console.');
    console.warn('   To enable Firestore logging, fix the service account authentication in Google Cloud Console.');
    isFirebaseAvailable = false;
}

export interface ProcessingLog {
    timestamp: admin.firestore.FieldValue;
    status: 'pending' | 'success' | 'error';
    requestId?: string;
    userId?: string;
    filePath?: string;
    fileType?: string;
    merchant?: string;
    amount?: number;
    date?: string;
    items?: string[];
    rawText?: string;
    confidence?: number;
    error?: string;
    processingTimeMs?: number;
}

/**
 * Logs the start of a document processing attempt.
 * @returns The ID of the created log document.
 */
export async function logProcessingAttempt(
    filePath: string, 
    fileType: string,
    requestId?: string,
    userId?: string
): Promise<string> {
    if (!isFirebaseAvailable || !db) {
        console.log(`[CONSOLE LOG] Processing attempt started (RequestID: ${requestId || 'none'}, File: ${filePath})`);
        return '';
    }

    try {
        const logEntry: ProcessingLog = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            filePath,
            fileType,
        };

        if (requestId) logEntry.requestId = requestId;
        if (userId) logEntry.userId = userId;

        const docRef = await db.collection(LOGS_COLLECTION).add(logEntry);
        console.log(`Created processing log with ID: ${docRef.id} (RequestID: ${requestId || 'none'})`);
        return docRef.id;
    } catch (error) {
        console.error('Error creating processing log:', error);
        return '';
    }
}

/**
 * Logs a successful document processing.
 * @param logId The ID of the log document to update.
 * @param data The extracted data to log.
 * @param processingTimeMs The time taken to process the document in milliseconds.
 */
export async function logProcessingSuccess(
    logId: string,
    data: {
        merchant: string;
        amount: number;
        date: string;
        items: string[];
        rawText: string;
        confidence: number;
    },
    processingTimeMs: number
): Promise<void> {
    if (!logId) return;

    if (!isFirebaseAvailable || !db) {
        console.log(`[CONSOLE LOG] Processing success: Merchant=${data.merchant}, Amount=${data.amount}, Date=${data.date}, Time=${processingTimeMs}ms`);
        return;
    }

    try {
        await db.collection(LOGS_COLLECTION).doc(logId).update({
            status: 'success',
            merchant: data.merchant,
            amount: data.amount,
            date: data.date,
            items: data.items,
            rawText: data.rawText, // Note: Firestore documents have a 1MB limit. Very long text might need truncation.
            confidence: data.confidence,
            processingTimeMs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Updated processing log ${logId} with success status`);
    } catch (error) {
        console.error(`Error updating processing log ${logId}:`, error);
    }
}

/**
 * Logs a failed document processing attempt.
 * @param logId The ID of the log document to update.
 * @param errorMessage The error message to log.
 * @param processingTimeMs The time taken to process the document in milliseconds (if applicable).
 */
export async function logProcessingError(
    logId: string,
    errorMessage: string,
    processingTimeMs?: number
): Promise<void> {
    if (!logId) return;

    if (!isFirebaseAvailable || !db) {
        console.log(`[CONSOLE LOG] Processing error: ${errorMessage} ${processingTimeMs ? `(Time=${processingTimeMs}ms)` : ''}`);
        return;
    }

    try {
        const updateData: any = {
            status: 'error',
            error: errorMessage,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (processingTimeMs !== undefined) {
            updateData.processingTimeMs = processingTimeMs;
        }

        await db.collection(LOGS_COLLECTION).doc(logId).update(updateData);
        console.log(`Updated processing log ${logId} with error status`);
    } catch (error) {
        console.error(`Error updating processing log ${logId}:`, error);
    }
}
