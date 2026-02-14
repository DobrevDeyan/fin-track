
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
// Assuming GOOGLE_APPLICATION_CREDENTIALS is set and has permissions
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const LOGS_COLLECTION = 'document_processing_logs';

export interface ProcessingLog {
    timestamp: admin.firestore.FieldValue;
    status: 'pending' | 'success' | 'error';
    filePath?: string;
    fileType?: string;
    merchant?: string;
    amount?: number;
    date?: string;
    confidence?: number;
    error?: string;
    processingTimeMs?: number;
}

/**
 * Logs the start of a document processing attempt.
 * @returns The ID of the created log document.
 */
export async function logProcessingAttempt(filePath: string, fileType: string): Promise<string> {
    try {
        const logEntry: ProcessingLog = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            filePath,
            fileType,
        };

        const docRef = await db.collection(LOGS_COLLECTION).add(logEntry);
        console.log(`Created processing log with ID: ${docRef.id}`);
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
        confidence: number;
    },
    processingTimeMs: number
): Promise<void> {
    if (!logId) return;

    try {
        await db.collection(LOGS_COLLECTION).doc(logId).update({
            status: 'success',
            merchant: data.merchant,
            amount: data.amount,
            date: data.date,
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
