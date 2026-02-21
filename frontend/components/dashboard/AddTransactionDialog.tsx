"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { TRANSACTION_CATEGORIES } from "@/lib/categories"
import { DEFAULT_INCOME_CATEGORIES } from "@/lib/firestore-types"
import { formatDateForInput } from "@/lib/date-utils"
import { Badge } from "@/components/ui/badge"
import { X, Upload, FileImage, Trash2 } from "lucide-react"
import { uploadReceipt, deleteReceipt, validateReceiptFile } from "@/lib/receipt-utils"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslations } from "next-intl"

interface TransactionData {
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  date: string
  notes?: string
  tags?: string[]
  receiptUrl?: string
  categoryId?: string
}

interface SavingsAccount {
  id: string
  name: string
  balance: number
  currency: string
}

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TransactionData) => Promise<void>
  editingEntry?: {
    id: string
    description: string
    amount: number
    category: string
    type: "income" | "expense"
    date: string
    notes?: string
    tags?: string[]
    receiptUrl?: string
  } | null
  savingsAccounts?: SavingsAccount[]
  defaultDate?: string
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  editingEntry,
  savingsAccounts = [],
  defaultDate,
}: AddTransactionDialogProps) {
  const { user } = useAuth()
  const t = useTranslations("dashboard")
  const tCommon = useTranslations("common")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [type, setType] = useState<"income" | "expense">("expense")
  const [date, setDate] = useState(formatDateForInput(new Date()))
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editingEntry) {
      setDescription(editingEntry.description)
      setAmount(editingEntry.amount.toString())
      setCategory(editingEntry.category)
      setType(editingEntry.type)
      setDate(formatDateForInput(editingEntry.date))
      setNotes(editingEntry.notes || "")
      setTags(editingEntry.tags || [])
      setExistingReceiptUrl(editingEntry.receiptUrl || null)
      setReceiptFile(null)
      setReceiptPreview(null)
    } else {
      // Reset form for new entry
      setDescription("")
      setAmount("")
      setCategory("")
      setType("expense")
      setDate(defaultDate || formatDateForInput(new Date()))
      setNotes("")
      setTags([])
      setTagInput("")
      setReceiptFile(null)
      setReceiptPreview(null)
      setExistingReceiptUrl(null)
    }
  }, [editingEntry, open, defaultDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !category) return

    try {
      let receiptUrl = existingReceiptUrl || undefined

      // Upload receipt if a new file was selected
      if (receiptFile && user) {
        setUploadingReceipt(true)
        try {
          receiptUrl = await uploadReceipt(user.uid, receiptFile, editingEntry?.id)
        } catch (error: any) {
          alert(error.message || "Failed to upload receipt. Please try again.")
          setUploadingReceipt(false)
          return
        } finally {
          setUploadingReceipt(false)
        }
      }

      
      // Determine if a special category was selected (e.g. savings)
      let finalCategory = category
      let finalCategoryId: string | undefined = undefined

      if (category.startsWith("savings_")) {
        const accountId = category.replace("savings_", "")
        const account = savingsAccounts.find(a => a.id === accountId)
        if (account) {
          finalCategory = account.name
          finalCategoryId = `savings_${accountId}`
        }
      }

      await onSubmit({
        description,
        amount: parseFloat(amount),
        category: finalCategory,
        type,
        date,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        receiptUrl,
        categoryId: finalCategoryId,
      })

      // Reset form
      setDescription("")
      setAmount("")
      setCategory("")
      setType("expense")
      setDate(formatDateForInput(new Date()))
      setNotes("")
      setTags([])
      setTagInput("")
      setReceiptFile(null)
      setReceiptPreview(null)
      setExistingReceiptUrl(null)
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      console.error("Error submitting entry:", error)
    }
  }



  // Tag management functions
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      if (!tags.includes(newTag) && newTag.length > 0) {
        setTags([...tags, newTag])
        setTagInput("")
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Receipt management functions
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const error = validateReceiptFile(file)
    if (error) {
      alert(error)
      return
    }

    setReceiptFile(file)
    setExistingReceiptUrl(null) // Clear existing receipt when uploading new one

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveReceipt = async () => {
    if (existingReceiptUrl) {
      try {
        await deleteReceipt(existingReceiptUrl)
      } catch (error) {
        console.error("Error deleting receipt:", error)
        // Continue anyway - the URL won't be included in the update
      }
    }
    setReceiptFile(null)
    setReceiptPreview(null)
    setExistingReceiptUrl(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingEntry ? t("editEntry") : t("addEntry")}</DialogTitle>
          <DialogDescription>
            {editingEntry
              ? t("editEntryDescription")
              : t("addEntryDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">{tCommon("type")}</Label>
              <Select value={type} onValueChange={(value: "income" | "expense") => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{tCommon("income")}</SelectItem>
                  <SelectItem value="expense">{tCommon("expense")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{tCommon("description")}</Label>
              <Input
                id="description"
                placeholder={t("descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">{tCommon("amount")}</Label>
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
              <Label htmlFor="category">{tCommon("category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {type === "expense" ? (
                    <>
                      {TRANSACTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      {savingsAccounts.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{t("savingsAccounts")}</SelectLabel>
                          {savingsAccounts.map((account) => (
                            <SelectItem key={`savings_${account.id}`} value={`savings_${account.id}`}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    DEFAULT_INCOME_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">{tCommon("date")}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">{t("tagsOptional")}</Label>
              <Input
                id="tags"
                placeholder={t("tagsPlaceholder")}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        aria-label={`Remove ${tag} tag`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receipt">{t("receiptOptional")}</Label>
              <div className="space-y-2">
                {receiptPreview || existingReceiptUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={receiptPreview || existingReceiptUrl || undefined}
                      alt={t("receiptPreview")}
                      className="max-h-32 rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                      aria-label={t("removeReceipt")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="receipt"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">{t("uploadReceipt")}</span> {t("dragDrop")}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("fileTypes")}</p>
                    </div>
                    <input
                      id="receipt"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      disabled={uploadingReceipt}
                    />
                  </label>
                )}
                {!receiptPreview && !existingReceiptUrl && (
                  <input
                    id="receipt-hidden"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    disabled={uploadingReceipt}
                  />
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">{t("notesOptional")}</Label>
              <Textarea
                id="notes"
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>


          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={uploadingReceipt}>
              {uploadingReceipt ? t("uploading") : editingEntry ? t("updateEntry") : t("addEntry")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

