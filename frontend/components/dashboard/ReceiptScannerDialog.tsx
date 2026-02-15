"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { TRANSACTION_CATEGORIES } from "@/lib/categories"
import { formatDateForInput } from "@/lib/date-utils"
import { Upload, FileImage, Loader2, AlertCircle, Check, X, Camera } from "lucide-react"
import { scanReceipt, ExtractedReceiptData } from "@/lib/receipt-scanner-api"
import { detectCategory } from "@/lib/category-detector"
import { isMobileDevice, hasCameraSupport } from "@/lib/device-utils"
import { CameraCapture } from "./CameraCapture"

import { useAuth } from "@/contexts/AuthContext"

interface TransactionData {
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  date: string
  notes?: string
  tags?: string[]
}

interface ReceiptScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TransactionData) => Promise<void>
}

type ScanState = "idle" | "uploading" | "processing" | "success" | "error"
type InputMode = "select" | "upload" | "camera"

export function ReceiptScannerDialog({
  open,
  onOpenChange,
  onSubmit,
}: ReceiptScannerDialogProps) {
  // State
  const [scanState, setScanState] = useState<ScanState>("idle")
  const [inputMode, setInputMode] = useState<InputMode>("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Auth context for logging user ID
  const { user } = useAuth()

  // Device capabilities
  const [isMobile, setIsMobile] = useState(false)
  const [canUseCamera, setCanUseCamera] = useState(false)

  // Editable form fields
  const [merchant, setMerchant] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(formatDateForInput(new Date()))
  const [category, setCategory] = useState("")

  // Check device capabilities on mount
  useEffect(() => {
    setIsMobile(isMobileDevice())
    setCanUseCamera(hasCameraSupport())
  }, [])

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setScanState("idle")
      setInputMode("select")
      setSelectedFile(null)
      setFilePreview(null)
      setExtractedData(null)
      setErrorMessage("")
      setMerchant("")
      setAmount("")
      setDate(formatDateForInput(new Date()))
      setCategory("")
    }
    onOpenChange(isOpen)
  }

  // Handle file selection (from upload or camera)
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ]

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF) or PDF.")
      setScanState("error")
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setErrorMessage("File size must be less than 10MB.")
      setScanState("error")
      return
    }

    setSelectedFile(file)
    setErrorMessage("")
    setScanState("idle")
    setInputMode("upload") // Switch to upload view to show preview

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      // For PDFs, show a placeholder
      setFilePreview(null)
    }
  }, [])

  // Handle camera capture
  const handleCameraCapture = useCallback((file: File) => {
    handleFileSelect(file)
  }, [handleFileSelect])

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  // Handle mobile camera input (using capture attribute)
  const handleMobileCameraInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  // Scan the receipt
  const handleScan = async () => {
    if (!selectedFile) return

    setScanState("processing")
    setErrorMessage("")

    try {
      const data = await scanReceipt(selectedFile, user?.uid)
      setExtractedData(data)

      // Populate form fields with extracted data
      setMerchant(data.merchant || "")
      setAmount(data.amount > 0 ? data.amount.toString() : "")
      setDate(data.date || formatDateForInput(new Date()))

      // Auto-detect category based on merchant name
      const detectedCategory = detectCategory(data.merchant, data.rawText)
      setCategory(detectedCategory)

      setScanState("success")
    } catch (error: any) {
      console.error("Error scanning receipt:", error)
      setErrorMessage(error.message || "Failed to scan receipt. Please try again.")
      setScanState("error")
    }
  }

  // Save as expense
  const handleSave = async () => {
    if (!amount || !category) {
      setErrorMessage("Please fill in all required fields (amount, category)")
      return
    }

    try {
      await onSubmit({
        description: merchant || "Scanned Receipt",
        amount: parseFloat(amount),
        category,
        type: "expense",
        date,
        notes: extractedData?.items?.length
          ? `Items: ${extractedData.items.join(", ")}`
          : undefined,
        tags: ["scanned-receipt"],
      })

      // Close dialog and reset state
      handleOpenChange(false)
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to save expense. Please try again.")
    }
  }

  // Clear selected file
  const handleClearFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setExtractedData(null)
    setScanState("idle")
    setErrorMessage("")
    setInputMode("select")
  }

  // Render input mode selection
  const renderModeSelection = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Choose how to add your receipt
      </p>

      <div className={`grid gap-4 ${isMobile && canUseCamera ? "grid-cols-1" : "grid-cols-1"}`}>
        {/* Camera option - shown prominently on mobile */}
        {canUseCamera && (
          <>
            {/* Full camera experience button */}
            <Button
              type="button"
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-primary hover:bg-primary/5"
              onClick={() => setInputMode("camera")}
            >
              <Camera className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-medium">Take Photo</p>
                <p className="text-xs text-muted-foreground">Use camera with live preview</p>
              </div>
            </Button>

            {/* Quick capture option for mobile */}
            {isMobile && (
              <label className="h-20 flex items-center justify-center gap-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <Camera className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Quick Capture</p>
                  <p className="text-xs text-muted-foreground">Open native camera</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleMobileCameraInput}
                />
              </label>
            )}
          </>
        )}

        {/* Upload option */}
        <label
          className="h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Upload File</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP, GIF or PDF (MAX. 10MB)
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={handleInputChange}
          />
        </label>
      </div>
    </div>
  )

  // Render camera view
  const renderCameraView = () => (
    <CameraCapture
      onCapture={handleCameraCapture}
      onCancel={() => setInputMode("select")}
    />
  )

  // Render upload/preview view
  const renderUploadView = () => (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="relative"
    >
      {!selectedFile ? (
        <label
          htmlFor="receipt-upload"
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <div className="flex flex-col items-center justify-center py-6">
            <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP, GIF or PDF (MAX. 10MB)
            </p>
          </div>
          <input
            id="receipt-upload"
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={handleInputChange}
          />
        </label>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-4">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Receipt preview"
                className="w-24 h-24 object-cover rounded-md border"
              />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                <FileImage className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleScan}
                  disabled={scanState !== "idle"}
                >
                  Scan Receipt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClearFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back button when in upload mode without file */}
      {!selectedFile && canUseCamera && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setInputMode("select")}
        >
          Back to options
        </Button>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Receipt</DialogTitle>
          <DialogDescription>
            {inputMode === "camera"
              ? "Point your camera at the receipt and capture"
              : inputMode === "select"
              ? "Take a photo or upload a receipt to extract expense details"
              : "Upload a receipt or bill image to automatically extract expense details"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Selection / Camera / Upload Section */}
          {scanState === "idle" && !extractedData && (
            <>
              {inputMode === "select" && renderModeSelection()}
              {inputMode === "camera" && renderCameraView()}
              {inputMode === "upload" && renderUploadView()}
            </>
          )}

          {/* Processing State */}
          {scanState === "processing" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Processing receipt...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
            </div>
          )}

          {/* Error State */}
          {scanState === "error" && errorMessage && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Scan Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={handleClearFile}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Success State - Editable Form */}
          {scanState === "success" && extractedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Receipt scanned successfully! Review and edit the details below.
                </span>
              </div>

              {/* Confidence indicator */}
              {extractedData.confidence < 0.7 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700 dark:text-yellow-400">
                    Low confidence scan ({Math.round(extractedData.confidence * 100)}%). Please verify the details.
                  </span>
                </div>
              )}

              {/* Editable Fields */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="merchant">Merchant / Description</Label>
                  <Input
                    id="merchant"
                    placeholder="e.g., Grocery Store"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Extracted Items Preview */}
              {extractedData.items && extractedData.items.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Detected Items:</p>
                  <ul className="list-disc list-inside">
                    {extractedData.items.slice(0, 5).map((item, index) => (
                      <li key={index} className="truncate">
                        {item}
                      </li>
                    ))}
                    {extractedData.items.length > 5 && (
                      <li>...and {extractedData.items.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Raw Entities Debug (collapsible) */}
              {Object.keys(extractedData.rawEntities).length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    View raw extracted data
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(extractedData.rawEntities, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {inputMode === "camera" ? (
            // No footer buttons in camera mode - controls are in the camera view
            null
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              {scanState === "success" && (
                <Button type="button" onClick={handleSave} disabled={!amount || !category}>
                  Save as Expense
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
