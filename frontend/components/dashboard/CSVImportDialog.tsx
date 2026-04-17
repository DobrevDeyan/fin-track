"use client"

/**
 * CSV Import Dialog
 *
 * Three-step import flow:
 *   Step 1 — Upload a CSV file
 *   Step 2 — Map CSV columns to Pocket fields (auto-detected where possible)
 *   Step 3 — Preview rows and confirm import
 *
 * On confirm, each row is written to Firestore via createEntry() and the
 * caller's onImportComplete callback is invoked so the dashboard can refresh.
 */

import { useState, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { createEntry } from "@/lib/firestore-entries"
import { TRANSACTION_CATEGORIES } from "@/lib/categories"
import { logger } from "@/lib/utils/logger"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Timestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  raw: Record<string, string>
  date: string | null
  description: string | null
  amount: number | null
  type: "income" | "expense" | null
  category: string | null
  notes: string | null
  valid: boolean
}

interface ColumnMapping {
  date: string
  description: string
  amount: string
  type: string       // optional — column containing "income"/"expense"/"debit"/"credit"
  category: string   // optional
  notes: string      // optional
}

const NOT_MAPPED = "__not_mapped__"

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { headers: [], rows: [] }

  const parse = (line: string): string[] => {
    const result: string[] = []
    let inQuote = false
    let cur = ""
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === "," && !inQuote) {
        result.push(cur.trim())
        cur = ""
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parse(lines[0])
  const rows = lines.slice(1).map(parse)
  return { headers, rows }
}

// ─── Auto-detect column mapping ───────────────────────────────────────────────

const DATE_HINTS = ["date", "дата", "time", "when"]
const DESC_HINTS = ["description", "memo", "detail", "note", "merchant", "payee", "описание", "бележка"]
const AMOUNT_HINTS = ["amount", "sum", "total", "value", "сума", "стойност"]
const TYPE_HINTS = ["type", "тип", "direction", "kind", "debit/credit"]
const CATEGORY_HINTS = ["category", "cat", "категория"]
const NOTES_HINTS = ["notes", "comment", "remarks", "бележки", "коментар"]

function detect(headers: string[], hints: string[]): string {
  const lower = headers.map((h) => h.toLowerCase())
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint))
    if (idx >= 0) return headers[idx]
  }
  return NOT_MAPPED
}

function autoDetectMapping(headers: string[]): ColumnMapping {
  return {
    date: detect(headers, DATE_HINTS),
    description: detect(headers, DESC_HINTS),
    amount: detect(headers, AMOUNT_HINTS),
    type: detect(headers, TYPE_HINTS),
    category: detect(headers, CATEGORY_HINTS),
    notes: detect(headers, NOTES_HINTS),
  }
}

// ─── Row parsing helpers ──────────────────────────────────────────────────────

function parseAmount(raw: string): number | null {
  if (!raw) return null
  // Remove currency symbols and spaces
  const cleaned = raw.replace(/[€$£¥₹,\s]/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.abs(num)
}

function parseType(raw: string, amount: number | null, amountSignIsExpense: boolean): "income" | "expense" {
  if (raw) {
    const lower = raw.toLowerCase()
    if (lower.includes("income") || lower.includes("credit") || lower.includes("приход")) return "income"
    if (lower.includes("expense") || lower.includes("debit") || lower.includes("разход")) return "expense"
  }
  // Fall back to amount sign if no explicit type column
  if (amountSignIsExpense && amount !== null) {
    // original string before abs()
    return "expense"
  }
  return "expense"
}

function parseAmountWithSign(raw: string): { amount: number | null; isNegative: boolean } {
  if (!raw) return { amount: null, isNegative: false }
  const cleaned = raw.replace(/[€$£¥₹\s]/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return { amount: null, isNegative: false }
  return { amount: Math.abs(num), isNegative: num < 0 }
}

const DATE_FORMATS = [
  /^(\d{4})-(\d{2})-(\d{2})/,           // YYYY-MM-DD
  /^(\d{2})\/(\d{2})\/(\d{4})/,         // DD/MM/YYYY or MM/DD/YYYY
  /^(\d{2})-(\d{2})-(\d{4})/,           // DD-MM-YYYY
  /^(\d{2})\.(\d{2})\.(\d{4})/,         // DD.MM.YYYY
]

function parseDate(raw: string): string | null {
  if (!raw) return null
  // Try native parsing first
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  // DD/MM/YYYY
  const dmY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmY) {
    const [, dd, mm, yyyy] = dmY
    const attempt = new Date(`${yyyy}-${mm}-${dd}`)
    if (!isNaN(attempt.getTime())) return attempt.toISOString().split("T")[0]
  }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

type Step = 1 | 2 | 3

export function CSVImportDialog({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) {
  const t = useTranslations("csvImport")
  const tCommon = useTranslations("common")
  const { user } = useAuth()
  const { userCurrency } = useCurrency()

  const [step, setStep] = useState<Step>(1)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: NOT_MAPPED,
    description: NOT_MAPPED,
    amount: NOT_MAPPED,
    type: NOT_MAPPED,
    category: NOT_MAPPED,
    notes: NOT_MAPPED,
  })
  const [amountSignIsExpense, setAmountSignIsExpense] = useState(true)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [parseError, setParseError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Reset when dialog closes ──────────────────────────────────────────────
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(1)
      setFileName("")
      setHeaders([])
      setRows([])
      setMapping({ date: NOT_MAPPED, description: NOT_MAPPED, amount: NOT_MAPPED, type: NOT_MAPPED, category: NOT_MAPPED, notes: NOT_MAPPED })
      setAmountSignIsExpense(true)
      setParsedRows([])
      setImporting(false)
      setImportProgress(0)
      setParseError("")
    }
    onOpenChange(open)
  }

  // ── File loading ─────────────────────────────────────────────────────────
  const loadFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError(t("parseError"))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError("File too large (max 5 MB).")
      return
    }
    setParseError("")
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCSV(text)
      if (h.length === 0 || r.length === 0) {
        setParseError(t("noRows"))
        return
      }
      setFileName(file.name)
      setHeaders(h)
      setRows(r)
      setMapping(autoDetectMapping(h))
      setStep(2)
    }
    reader.readAsText(file, "UTF-8")
  }, [t])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  // ── Step 2 → Step 3: parse rows ────────────────────────────────────────────
  const buildParsedRows = useCallback((): ParsedRow[] => {
    return rows.map((row) => {
      const get = (col: string) => (col !== NOT_MAPPED && headers.includes(col) ? row[headers.indexOf(col)] ?? "" : "")

      const rawAmount = get(mapping.amount)
      const { amount, isNegative } = parseAmountWithSign(rawAmount)

      const rawType = get(mapping.type)
      let type: "income" | "expense"
      if (rawType) {
        type = parseType(rawType, amount, amountSignIsExpense)
      } else if (amountSignIsExpense) {
        type = isNegative ? "expense" : "income"
      } else {
        type = "expense"
      }

      const rawDate = get(mapping.date)
      const date = parseDate(rawDate)

      const description = get(mapping.description).trim()
      const category = get(mapping.category).trim()
      const notes = get(mapping.notes).trim()

      const valid = !!(date && description && amount !== null && amount > 0)

      return {
        raw: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])),
        date,
        description: description || null,
        amount,
        type,
        category: TRANSACTION_CATEGORIES.includes(category as typeof TRANSACTION_CATEGORIES[number])
          ? category
          : null,
        notes: notes || null,
        valid,
      }
    })
  }, [rows, headers, mapping, amountSignIsExpense])

  const goToPreview = () => {
    const parsed = buildParsedRows()
    if (parsed.filter((r) => r.valid).length === 0) {
      setParseError(t("noRows"))
      return
    }
    setParseError("")
    setParsedRows(parsed)
    setStep(3)
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!user) return
    const validRows = parsedRows.filter((r) => r.valid)
    if (validRows.length === 0) return

    setImporting(true)
    setImportProgress(0)

    let succeeded = 0
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      try {
        await createEntry(user.uid, {
          type: row.type!,
          amount: row.amount!,
          currency: userCurrency,
          description: row.description!,
          category: row.category || "Other",
          date: Timestamp.fromDate(new Date(row.date!)),
          notes: row.notes || undefined,
        })
        succeeded++
      } catch (err) {
        logger.error("Failed to import CSV row", err, { rowNumber: i })
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100))
    }

    setImporting(false)

    if (succeeded > 0) {
      toast.success(t("successMessage", { count: succeeded }))
      onImportComplete()
      handleOpenChange(false)
    } else {
      toast.error(t("errorMessage"))
    }
  }

  // ── Mapping helpers ───────────────────────────────────────────────────────
  const mappingOptions = [NOT_MAPPED, ...headers]

  const updateMapping = (field: keyof ColumnMapping, value: string) =>
    setMapping((prev) => ({ ...prev, [field]: value }))

  const mappingValid = mapping.date !== NOT_MAPPED && mapping.description !== NOT_MAPPED && mapping.amount !== NOT_MAPPED

  // ── Render ────────────────────────────────────────────────────────────────
  const validCount = parsedRows.filter((r) => r.valid).length
  const skippedCount = parsedRows.length - validCount

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {step === 1 && t("step1Description")}
            {step === 2 && t("step2Description")}
            {step === 3 && t("step3Description")}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-sm mb-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={step === s ? "text-foreground font-medium" : "text-muted-foreground"}>
                {s === 1 ? t("step1Title") : s === 2 ? t("step2Title") : t("step3Title")}
              </span>
              {s < 3 && <span className="text-muted-foreground mx-1">›</span>}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="flex-1 overflow-auto">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{t("dropzone")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("dropzoneHint")}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-destructive text-sm mt-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Map columns ── */}
        {step === 2 && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded px-3 py-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
              <Badge variant="secondary" className="ml-auto flex-shrink-0">{rows.length} rows</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Required fields */}
              <MappingRow label={t("columnDate")} required value={mapping.date} options={mappingOptions} onChange={(v) => updateMapping("date", v)} />
              <MappingRow label={t("columnDescription")} required value={mapping.description} options={mappingOptions} onChange={(v) => updateMapping("description", v)} />
              <MappingRow label={t("columnAmount")} required value={mapping.amount} options={mappingOptions} onChange={(v) => updateMapping("amount", v)} />
              {/* Optional fields */}
              <MappingRow label={t("columnType")} value={mapping.type} options={mappingOptions} onChange={(v) => updateMapping("type", v)} />
              <MappingRow label={t("columnCategory")} value={mapping.category} options={mappingOptions} onChange={(v) => updateMapping("category", v)} />
              <MappingRow label={t("columnNotes")} value={mapping.notes} options={mappingOptions} onChange={(v) => updateMapping("notes", v)} />
            </div>

            {/* Amount sign option (shown only when no type column mapped) */}
            {mapping.type === NOT_MAPPED && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="amountSign"
                  checked={amountSignIsExpense}
                  onCheckedChange={(v) => setAmountSignIsExpense(Boolean(v))}
                />
                <Label htmlFor="amountSign" className="text-sm cursor-pointer">
                  {t("amountSign")}
                </Label>
              </div>
            )}

            {parseError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 3 && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="default">{validCount} ready</Badge>
              {skippedCount > 0 && (
                <Badge variant="secondary">{skippedCount} skipped (missing required fields)</Badge>
              )}
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">{tCommon("date")}</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">{tCommon("description")}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">{tCommon("amount")}</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">{tCommon("type")}</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">{tCommon("category")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-t",
                        !row.valid && "opacity-40 bg-muted/30"
                      )}
                    >
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5">{row.date ?? <span className="text-destructive text-xs">missing</span>}</td>
                      <td className="px-3 py-1.5 max-w-[160px] truncate">{row.description ?? <span className="text-destructive text-xs">missing</span>}</td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {row.amount !== null ? row.amount.toFixed(2) : <span className="text-destructive text-xs">missing</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        {row.type && (
                          <Badge variant={row.type === "income" ? "default" : "secondary"} className="text-xs">
                            {row.type}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground text-xs">{row.category ?? "Other"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importing && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("importing")}</p>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-3 border-t mt-auto">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={importing}>
            {t("cancel")}
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)} disabled={importing}>
                {t("back")}
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {t("step1Title")}
              </Button>
            )}
            {step === 2 && (
              <Button onClick={goToPreview} disabled={!mappingValid}>
                {t("next")}
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? t("importing") : t("importButton", { count: validCount })}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── MappingRow sub-component ─────────────────────────────────────────────────

function MappingRow({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string
  required?: boolean
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NOT_MAPPED}>— not mapped —</SelectItem>
          {options.filter((o) => o !== NOT_MAPPED).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
