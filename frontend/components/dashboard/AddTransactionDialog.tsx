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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { TRANSACTION_CATEGORIES } from "@/lib/categories"
import { formatDateForInput } from "@/lib/date-utils"
import { Badge } from "@/components/ui/badge"
import { X, Upload, FileImage, Trash2 } from "lucide-react"
import { uploadReceipt, deleteReceipt, validateReceiptFile } from "@/lib/receipt-utils"
import { useAuth } from "@/contexts/AuthContext"

interface TransactionData {
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  date: string
  notes?: string
  tags?: string[]
  receiptUrl?: string
  allocateToSavings?: {
    accountId: string
    amount: number
  }
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
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  editingEntry,
  savingsAccounts = [],
}: AddTransactionDialogProps) {
  const { user } = useAuth()
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
  const [allocateToSavings, setAllocateToSavings] = useState(false)
  const [savingsAccountId, setSavingsAccountId] = useState("")
  const [savingsAmount, setSavingsAmount] = useState("")

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
      setDate(formatDateForInput(new Date()))
      setNotes("")
      setTags([])
      setTagInput("")
      setReceiptFile(null)
      setReceiptPreview(null)
      setExistingReceiptUrl(null)
      setAllocateToSavings(false)
      setSavingsAccountId("")
      setSavingsAmount("")
    }
  }, [editingEntry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !category) return

    // Validate savings allocation if enabled
    if (allocateToSavings) {
      if (!savingsAccountId) {
        alert("Please select a savings account")
        return
      }
      const savingsAmountNum = parseFloat(savingsAmount) || 0
      const incomeAmount = parseFloat(amount) || 0
      if (savingsAmountNum <= 0) {
        alert("Savings amount must be greater than 0")
        return
      }
      if (savingsAmountNum > incomeAmount) {
        alert("Savings amount cannot exceed income amount")
        return
      }
    }

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

      await onSubmit({
        description,
        amount: parseFloat(amount),
        category,
        type,
        date,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        receiptUrl,
        allocateToSavings: allocateToSavings && savingsAccountId
          ? {
              accountId: savingsAccountId,
              amount: parseFloat(savingsAmount) || 0,
            }
          : undefined,
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
      setAllocateToSavings(false)
      setSavingsAccountId("")
      setSavingsAmount("")
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      console.error("Error submitting entry:", error)
    }
  }

  // Update savings amount when income amount changes (if allocating)
  useEffect(() => {
    if (allocateToSavings && type === "income" && amount) {
      const incomeAmount = parseFloat(amount) || 0
      const currentSavingsAmount = parseFloat(savingsAmount) || 0
      // Auto-set savings amount to income amount if not set, or adjust if it exceeds
      if (currentSavingsAmount === 0 || currentSavingsAmount > incomeAmount) {
        setSavingsAmount(incomeAmount.toString())
      }
    }
  }, [amount, type, allocateToSavings])

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
          <DialogTitle>{editingEntry ? "Edit Entry" : "Add Entry"}</DialogTitle>
          <DialogDescription>
            {editingEntry
              ? "Update your transaction details."
              : "Add a new income or expense entry to track your finances."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: "income" | "expense") => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Grocery shopping"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
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
              <Label htmlFor="category">Category</Label>
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
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                placeholder="Type a tag and press Enter"
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
              <Label htmlFor="receipt">Receipt (Optional)</Label>
              <div className="space-y-2">
                {receiptPreview || existingReceiptUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={receiptPreview || existingReceiptUrl || undefined}
                      alt="Receipt preview"
                      className="max-h-32 rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                      aria-label="Remove receipt"
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
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF (MAX. 5MB)</p>
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
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Savings Allocation - Only show for income */}
            {type === "income" && (
              <div className="grid gap-3 pt-2 border-t">
                {savingsAccounts.length > 0 ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allocateToSavings"
                        checked={allocateToSavings}
                        onCheckedChange={(checked: any) => {
                          setAllocateToSavings(checked === true)
                          if (!checked) {
                            setSavingsAccountId("")
                            setSavingsAmount("")
                          }
                        }}
                      />
                      <Label
                        htmlFor="allocateToSavings"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Allocate to Savings Account
                      </Label>
                    </div>
                    {allocateToSavings && (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="savingsAccount">Savings Account</Label>
                          <Select
                            value={savingsAccountId}
                            onValueChange={setSavingsAccountId}
                            required={allocateToSavings}
                          >
                            <SelectTrigger id="savingsAccount">
                              <SelectValue placeholder="Select savings account" />
                            </SelectTrigger>
                            <SelectContent>
                              {savingsAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="savingsAmount">Amount to Allocate</Label>
                          <Input
                            id="savingsAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            max={amount || undefined}
                            placeholder="0.00"
                            value={savingsAmount}
                            onChange={(e) => setSavingsAmount(e.target.value)}
                            required={allocateToSavings}
                          />
                          {amount && (
                            <p className="text-xs text-muted-foreground">
                              Income: {parseFloat(amount).toFixed(2)} | 
                              Remaining: {(parseFloat(amount) - (parseFloat(savingsAmount) || 0)).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                    💡 Create a savings account first to allocate income directly to savings.
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadingReceipt}>
              {uploadingReceipt ? "Uploading..." : editingEntry ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

