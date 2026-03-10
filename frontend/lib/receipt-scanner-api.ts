/**
 * Receipt Scanner API Service
 *
 * Handles communication with the ML service for receipt/bill scanning
 */

// ML Service URL - defaults to localhost for development
const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Extracted receipt data from the ML service
 */
export interface ExtractedReceiptData {
  merchant: string;
  amount: number;
  date: string;
  items: string[];
  rawText: string;
  confidence: number;
  rawEntities: Record<string, string>;
}

/**
 * API response structure from the ML service
 */
interface ScanReceiptResponse {
  success: boolean;
  message: string;
  data?: ExtractedReceiptData;
  error?: string;
}

/**
 * Validate that a file's actual content matches an allowed image/PDF format
 * by checking the first 12 bytes against known magic byte signatures.
 * This prevents spoofed MIME types (e.g. a .txt renamed to .jpg).
 */
export async function validateMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) return true
  // PDF: %PDF (25 50 44 46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return true
  // WebP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true
  // GIF: GIF8 (47 49 46 38)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true

  return false
}

/**
 * Scan a receipt file using the ML service
 * @param file - The receipt image or PDF file to scan
 * @param userId - Optional user ID for tracking
 * @returns Extracted receipt data
 * @throws Error if the scan fails
 */
export async function scanReceipt(file: File, token: string, userId?: string): Promise<ExtractedReceiptData> {
  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF) or PDF.');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB.');
  }

  // Validate actual file content via magic bytes (prevents spoofed MIME types)
  const validBytes = await validateMagicBytes(file);
  if (!validBytes) {
    throw new Error('File content does not match its type. Please upload a valid image or PDF.');
  }

  // Generate a request ID for tracing
  const requestId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Create form data
  const formData = new FormData();
  formData.append('billFile', file);
  formData.append('requestId', requestId);
  
  if (userId) {
    formData.append('userId', userId);
  }

  console.log(`[ML-Service] Starting scan request ${requestId} for file ${file.name} (${file.type})`);

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/upload-bill`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const result: ScanReceiptResponse = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error || 'Failed to scan receipt');
    }

    if (!result.data) {
      throw new Error('No data extracted from receipt');
    }

    return result.data;
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the scanning service. Please make sure the ML service is running.');
    }
    throw error;
  }
}

/**
 * Check if the ML service is healthy and available
 * @returns true if the service is available
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Transaction data structure for creating entries
 */
export interface TransactionData {
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  notes?: string;
  tags?: string[];
}

/**
 * Map extracted receipt data to transaction data
 * @param extracted - Extracted receipt data from ML service
 * @param category - Category to assign to the transaction
 * @returns Transaction data ready to save
 */
export function mapToTransactionData(
  extracted: ExtractedReceiptData,
  category: string
): TransactionData {
  // Build notes from extracted items
  let notes = '';
  if (extracted.items && extracted.items.length > 0) {
    notes = `Items: ${extracted.items.join(', ')}`;
  }

  // Add confidence info to notes if it's low
  if (extracted.confidence < 0.7 && notes) {
    notes += ` (OCR confidence: ${Math.round(extracted.confidence * 100)}%)`;
  } else if (extracted.confidence < 0.7) {
    notes = `OCR confidence: ${Math.round(extracted.confidence * 100)}%`;
  }

  return {
    description: extracted.merchant || 'Scanned Receipt',
    amount: extracted.amount,
    category,
    type: 'expense',
    date: extracted.date,
    notes: notes || undefined,
    tags: ['scanned-receipt'],
  };
}
