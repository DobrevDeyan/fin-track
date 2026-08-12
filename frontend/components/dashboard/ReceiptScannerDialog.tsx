"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
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
import { EXPENSE_CATEGORIES } from "@/lib/categories"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"
import {
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/constants/currency.constants"
import { logger } from "@/lib/utils/logger"

import { formatDateForInput } from "@/lib/date-utils"
import { Upload, FileImage, Loader2, AlertCircle, Check, X, Camera } from "lucide-react"
import { scanReceipt, validateMagicBytes, ExtractedReceiptData } from "@/lib/receipt-scanner-api"
import { uploadReceipt } from "@/lib/receipt-utils"
import { detectCategory } from "@/lib/category-detector"
import { isMobileDevice, hasCameraSupport } from "@/lib/device-utils"
import { CameraCapture } from "./CameraCapture"

import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { auth } from "@/lib/firebase"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useScanQuota } from "@/lib/hooks/useScanQuota"
import { UpgradePrompt } from "@/components/ui/UpgradePrompt"

interface TransactionData {
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  date: string
  notes?: string
  tags?: string[]
  receiptUrl?: string
}

interface ReceiptScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TransactionData) => Promise<void>
}

type ScanState = "idle" | "uploading" | "processing" | "success" | "error"
type InputMode = "select" | "upload" | "camera"

// File accepted by both the client validator, the ML service and Document AI.
const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/gif,application/pdf"

export function ReceiptScannerDialog({
  open,
  onOpenChange,
  onSubmit,
}: ReceiptScannerDialogProps) {
  const t = useTranslations("receipts")

  // State
  const [scanState, setScanState] = useState<ScanState>("idle")
  const [inputMode, setInputMode] = useState<InputMode>("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  // Auth context for logging user ID
  const { user } = useAuth()
  const { isPro, loading: subscriptionLoading } = useSubscription()
  const { remaining, limit } = useScanQuota()

  // Currency: the scanned amount is in the receipt's printed currency, which may
  // differ from the user's display currency. We convert it explicitly (RCP-1).
  const { convertAmount, userCurrency, exchangeRates } = useCurrency()
  const ratesReady = exchangeRates !== null

  // True once the user has used up their monthly scan quota — block scanning
  // before the round-trip rather than burning a doomed request (RCP-3).
  // limit === 0 means the tier has no scanning entitlement at all (free tier),
  // which is also a blocked state — not an "unset" one.
  const atLimit = remaining <= 0

  // Abort controller for an in-flight scan so it can be cancelled on
  // close/unmount and never hang the dialog (RCP-4).
  const scanAbortRef = useRef<AbortController | null>(null)

  // Device capabilities
  const [isMobile, setIsMobile] = useState(false)
  const [canUseCamera, setCanUseCamera] = useState(false)

  // Editable form fields
  const [merchant, setMerchant] = useState("")
  const [amount, setAmount] = useState("")
  const [receiptCurrency, setReceiptCurrency] = useState<SupportedCurrency>(userCurrency)
  const [date, setDate] = useState(formatDateForInput(new Date()))
  const [category, setCategory] = useState("")

  // Check device capabilities on mount
  useEffect(() => {
    setIsMobile(isMobileDevice())
    setCanUseCamera(hasCameraSupport())
  }, [])

  // Abort any in-flight scan if the component unmounts.
  useEffect(() => {
    return () => scanAbortRef.current?.abort()
  }, [])

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      scanAbortRef.current?.abort()
      scanAbortRef.current = null
      setScanState("idle")
      setInputMode("select")
      setSelectedFile(null)
      setFilePreview(null)
      setExtractedData(null)
      setErrorMessage("")
      setMerchant("")
      setAmount("")
      setReceiptCurrency(userCurrency)
      setDate(formatDateForInput(new Date()))
      setCategory("")
    }
    onOpenChange(isOpen)
  }

  // Handle file selection (from upload or camera)
  const handleFileSelect = useCallback(async (file: File) => {
    // HEIC/HEIF (common from iOS) is not processable by Document AI — give a
    // clear, actionable message instead of the generic "invalid type" (RCP-8).
    const isHeic =
      /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
    if (isHeic) {
      setErrorMessage(t("scanner.errors.heicUnsupported"))
      setScanState("error")
      return
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ]

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(t("scanner.errors.invalidType"))
      setScanState("error")
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setErrorMessage(t("scanner.errors.tooLarge"))
      setScanState("error")
      return
    }

    // Validate actual file content via magic bytes
    const validBytes = await validateMagicBytes(file)
    if (!validBytes) {
      setErrorMessage(t("scanner.errors.contentMismatch"))
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
  }, [t])

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
    if (!selectedFile || atLimit) return

    // Cancel any previous in-flight scan and start a fresh controller.
    scanAbortRef.current?.abort()
    const controller = new AbortController()
    scanAbortRef.current = controller

    setScanState("processing")
    setErrorMessage("")

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        setScanState("error")
        setErrorMessage(t("scanner.errors.notAuthenticated"))
        return
      }
      const data = await scanReceipt(selectedFile, token, user?.uid, controller.signal)
      setExtractedData(data)

      // Populate form fields — treat "Unknown Merchant" as blank so user fills it in
      setMerchant(data.merchant && data.merchant !== "Unknown Merchant" ? data.merchant : "")
      setAmount(data.amount > 0 ? data.amount.toString() : "")
      // Use the detected currency when it's one we support, otherwise assume the
      // user's display currency (RCP-1).
      setReceiptCurrency(
        data.currency && isSupportedCurrency(data.currency)
          ? (data.currency as SupportedCurrency)
          : userCurrency
      )
      setDate(data.date || formatDateForInput(new Date()))

      // Auto-detect category based on merchant name
      const detectedCategory = detectCategory(data.merchant, data.rawText)
      setCategory(detectedCategory)

      setScanState("success")
    } catch (error: any) {
      // A deliberate cancel (dialog closed / new scan) is not an error.
      if (error?.name === "AbortError") return

      logger.error("Error scanning receipt", error)
      const isQuotaError = error?.status === 402 || error?.errorCode === "QuotaExceeded"
      setErrorMessage(
        isQuotaError
          ? t("scanner.errors.quotaExceeded")
          : error.message || t("scanner.errors.scanFailed")
      )
      setScanState("error")
    } finally {
      if (scanAbortRef.current === controller) scanAbortRef.current = null
    }
  }

  // Filter raw OCR items to only meaningful, human-readable text
  const getMeaningfulItems = (items: string[]): string[] => {
    return items
      .map((i) => i.trim())
      .filter((i) =>
        i.length >= 3 &&                        // skip very short tokens
        !/^\d+([.,]\d+)?$/.test(i) &&           // skip pure numbers
        !i.startsWith("#") &&                   // skip bank/payment codes
        !/^[A-Z0-9\/\-]{6,}$/.test(i)          // skip all-caps codes (e.g. DT1279283-0011)
      )
      .filter((i, idx, arr) => arr.indexOf(i) === idx) // deduplicate
  }

  // Save as expense
  const handleSave = async () => {
    if (!amount || !category) {
      setErrorMessage(t("scanner.errors.missingFields"))
      return
    }

    // If the receipt currency differs from the display currency we need live
    // exchange rates to convert correctly; block until they're loaded (RCP-1).
    if (receiptCurrency !== userCurrency && !ratesReady) {
      setErrorMessage(t("scanner.errors.ratesLoading"))
      return
    }

    if (isSaving) return
    setIsSaving(true)

    const meaningfulItems = getMeaningfulItems(extractedData?.items ?? [])
    const description = merchant && merchant !== "Unknown Merchant" ? merchant : "Scanned Receipt"

    // Convert the entered amount from the receipt's currency into the user's
    // display currency. onSubmit (handleAdd) then converts display → base (EUR)
    // for storage, so the stored amount reflects the real receipt value (RCP-1).
    const enteredAmount = parseFloat(amount)
    const amountInDisplayCurrency =
      receiptCurrency === userCurrency
        ? enteredAmount
        : convertAmount(enteredAmount, receiptCurrency, userCurrency)

    try {
      // Upload the receipt image to Firebase Storage
      let receiptUrl: string | undefined
      if (selectedFile && user) {
        try {
          receiptUrl = await uploadReceipt(user.uid, selectedFile)
        } catch (uploadError) {
          logger.error("Receipt upload failed", uploadError)
          // Non-fatal — save the entry without a receipt URL
        }
      }

      await onSubmit({
        description,
        amount: amountInDisplayCurrency,
        category,
        type: "expense",
        date,
        notes: meaningfulItems.length > 0
          ? t("scanner.itemsNote", { items: meaningfulItems.join(", ") })
          : undefined,
        tags: ["scanned-receipt"],
        receiptUrl,
      })

      // Close dialog and reset state
      handleOpenChange(false)
    } catch (error: any) {
      setErrorMessage(error.message || t("scanner.errors.saveFailed"))
    } finally {
      setIsSaving(false)
    }
  }

  // Clear selected file
  const handleClearFile = () => {
    scanAbortRef.current?.abort()
    scanAbortRef.current = null
    setSelectedFile(null)
    setFilePreview(null)
    setExtractedData(null)
    setScanState("idle")
    setErrorMessage("")
    setInputMode("select")
  }

  // Banner shown when the monthly scan quota is exhausted (RCP-3).
  const renderLimitBanner = () =>
    atLimit ? (
      <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <span className="text-xs text-yellow-700 dark:text-yellow-400">
          {t("scanner.limitReached")}
        </span>
      </div>
    ) : null

  // Render input mode selection
  const renderModeSelection = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        {t("scanner.chooseMethod")}
      </p>

      <div className="grid gap-4 grid-cols-1">
        {/* Camera option - shown prominently on mobile */}
        {canUseCamera && (
          <>
            {/* Full camera experience button */}
            <Button
              type="button"
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-primary hover:bg-primary/5"
              onClick={() => setInputMode("camera")}
              disabled={atLimit}
            >
              <Camera className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-medium">{t("scanner.takePhoto")}</p>
                <p className="text-xs text-muted-foreground">{t("scanner.takePhotoHint")}</p>
              </div>
            </Button>

            {/* Quick capture option for mobile */}
            {isMobile && (
              <label className={`h-20 flex items-center justify-center gap-3 border-2 border-dashed rounded-lg transition-colors ${atLimit ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-primary/5"}`}>
                <Camera className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{t("scanner.quickCapture")}</p>
                  <p className="text-xs text-muted-foreground">{t("scanner.quickCaptureHint")}</p>
                </div>
                <input
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  capture="environment"
                  className="hidden"
                  disabled={atLimit}
                  onChange={handleMobileCameraInput}
                />
              </label>
            )}
          </>
        )}

        {/* Upload option */}
        <label
          className={`h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg transition-colors ${atLimit ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-primary/5"}`}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">{t("scanner.uploadFile")}</p>
            <p className="text-xs text-muted-foreground">
              {t("scanner.fileTypes")}
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={ACCEPTED_FILE_TYPES}
            disabled={atLimit}
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
              <span className="font-semibold">{t("scanner.clickToUpload")}</span> {t("scanner.orDragDrop")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("scanner.fileTypes")}
            </p>
          </div>
          <input
            id="receipt-upload"
            type="file"
            className="hidden"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleInputChange}
          />
        </label>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-4">
            {filePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={filePreview}
                alt={t("scanner.title")}
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
                  disabled={scanState !== "idle" || atLimit}
                >
                  {t("scanner.scanButton")}
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
          {t("scanner.backToOptions")}
        </Button>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-none">
        <DialogHeader>
          <DialogTitle>{t("scanner.title")}</DialogTitle>
          <DialogDescription>
            {inputMode === "camera"
              ? t("scanner.descCamera")
              : inputMode === "select"
              ? t("scanner.descSelect")
              : t("scanner.descUpload")
            }
          </DialogDescription>
        </DialogHeader>

        {/* Quota gate: every tier can scan; free users only hit the upgrade wall
            once they've used their monthly allowance (SCAN_LIMITS.free). */}
        {subscriptionLoading ? (
          <div className="py-4">
            <div className="h-48 rounded-lg animate-pulse bg-muted" />
          </div>
        ) : !isPro && atLimit ? (
          <div className="py-4">
            <UpgradePrompt
              mode="card"
              feature={t("scanner.feature")}
              description={t("scanner.featureDescription")}
            />
          </div>
        ) : (
        <>
        {/* Quota indicator for paying users */}
        {limit > 0 && (
          <div className="text-xs text-muted-foreground text-right pb-1">
            {t("scanner.scansRemaining", { remaining, limit })}
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Mode Selection / Camera / Upload Section */}
          {scanState === "idle" && !extractedData && (
            <>
              {inputMode !== "camera" && renderLimitBanner()}
              {inputMode === "select" && renderModeSelection()}
              {inputMode === "camera" && renderCameraView()}
              {inputMode === "upload" && renderUploadView()}
            </>
          )}

          {/* Processing State */}
          {scanState === "processing" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">{t("scanner.processing")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("scanner.processingHint")}</p>
            </div>
          )}

          {/* Error State */}
          {scanState === "error" && errorMessage && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{t("scanner.scanFailed")}</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={handleClearFile}
                >
                  {t("scanner.tryAgain")}
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
                  {t("scanner.success")}
                </span>
              </div>

              {/* Confidence indicator */}
              {extractedData.confidence < 0.7 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700 dark:text-yellow-400">
                    {t("scanner.lowConfidence", { percent: Math.round(extractedData.confidence * 100) })}
                  </span>
                </div>
              )}

              {/* Editable Fields */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="merchant">{t("scanner.merchantLabel")}</Label>
                  <Input
                    id="merchant"
                    placeholder={t("scanner.merchantPlaceholder")}
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount">{t("scanner.amountLabel")} *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={AMOUNT_RULES.MAX}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1"
                      required
                    />
                    <Select
                      value={receiptCurrency}
                      onValueChange={(v) => setReceiptCurrency(v as SupportedCurrency)}
                    >
                      <SelectTrigger className="w-24" aria-label={t("scanner.currencyLabel")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">{t("scanner.categoryLabel")} *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("scanner.categoryPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">{t("scanner.dateLabel")}</Label>
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
                  <p className="font-medium mb-1">{t("scanner.detectedItems")}</p>
                  <ul className="list-disc list-inside">
                    {extractedData.items.slice(0, 5).map((item, index) => (
                      <li key={index} className="truncate">
                        {item}
                      </li>
                    ))}
                    {extractedData.items.length > 5 && (
                      <li>{t("scanner.andMore", { count: extractedData.items.length - 5 })}</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Raw Entities Debug (collapsible) */}
              {Object.keys(extractedData.rawEntities).length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    {t("scanner.viewRaw")}
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
                {t("scanner.cancel")}
              </Button>
              {scanState === "success" && (
                <Button type="button" onClick={handleSave} disabled={!amount || !category || isSaving}>
                  {isSaving ? t("scanner.saving") : t("scanner.save")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
