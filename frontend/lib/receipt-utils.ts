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
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image")
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB")
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
 * Validate receipt file
 * @param file - File to validate
 * @returns Error message if invalid, null if valid
 */
export function validateReceiptFile(file: File): string | null {
  // Check file type
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
