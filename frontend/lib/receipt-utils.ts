/**
 * Receipt Upload Utilities
 * 
 * Functions for uploading receipt images to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "./firebase"

/**
 * Upload a receipt image to Firebase Storage
 * @param userId - User ID
 * @param file - File to upload
 * @param transactionId - Optional transaction ID (if editing existing transaction)
 * @returns Promise with the download URL
 */
export async function uploadReceipt(
  userId: string,
  file: File,
  transactionId?: string
): Promise<string> {
  try {
    // Deep validation: MIME type + magic bytes (prevents spoofed file extensions)
    const validationError = await validateReceiptFileDeep(file)
    if (validationError) {
      throw new Error(validationError)
    }

    // Create storage path
    const timestamp = Date.now()
    const filename = transactionId
      ? `receipt_${transactionId}_${timestamp}.${file.name.split(".").pop()}`
      : `receipt_${userId}_${timestamp}.${file.name.split(".").pop()}`
    
    const storageRef = ref(storage, `receipts/${userId}/${filename}`)

    // Upload file
    await uploadBytes(storageRef, file)

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef)

    return downloadURL
  } catch (error) {
    console.error("Error uploading receipt:", error)
    throw error
  }
}

/**
 * Delete a receipt from Firebase Storage
 * @param receiptUrl - URL of the receipt to delete
 */
export async function deleteReceipt(receiptUrl: string): Promise<void> {
  try {
    // Extract the storage path from the URL
    // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?...
    const url = new URL(receiptUrl)
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
    
    if (!pathMatch) {
      throw new Error("Invalid receipt URL")
    }

    // Decode the path (URL encoded)
    const storagePath = decodeURIComponent(pathMatch[1])
    const storageRef = ref(storage, storagePath)

    // Delete the file
    await deleteObject(storageRef)
  } catch (error) {
    console.error("Error deleting receipt:", error)
    throw error
  }
}

/**
 * Validate image file signature by reading magic bytes.
 * This prevents spoofed MIME types (e.g. a .exe renamed to .jpg).
 * Supports: JPEG, PNG, GIF, WebP, BMP, HEIC/HEIF
 */
async function validateImageSignature(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer()
  const b = new Uint8Array(buffer)

  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return true
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return true
  // GIF: 47 49 46 38 (GIF8)
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return true
  // WebP: RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return true
  // BMP: 42 4D
  if (b[0] === 0x42 && b[1] === 0x4D) return true
  // HEIC/HEIF: ftyp box at offset 4
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return true

  return false
}

/**
 * Validate receipt file (MIME type + size check — sync, for quick UI feedback)
 * @param file - File to validate
 * @returns Error message if invalid, null if valid
 */
export function validateReceiptFile(file: File): string | null {
  // Check file type via MIME (fast client-side check)
  if (!file.type.startsWith("image/")) {
    return "File must be an image (JPG, PNG, etc.)"
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return "File size must be less than 5MB"
  }

  return null
}

/**
 * Deep-validate receipt file including magic bytes check.
 * Call this before upload for defense-in-depth against spoofed MIME types.
 * @param file - File to validate
 * @returns Error message if invalid, null if valid
 */
export async function validateReceiptFileDeep(file: File): Promise<string | null> {
  const quickCheck = validateReceiptFile(file)
  if (quickCheck) return quickCheck

  const validSignature = await validateImageSignature(file)
  if (!validSignature) {
    return "File does not appear to be a valid image"
  }

  return null
}
