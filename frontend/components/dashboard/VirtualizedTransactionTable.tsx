"use client"

import { List, RowComponentProps } from "react-window"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, FileImage } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"
import { formatDateCompact } from "@/lib/date-utils"
import { getCategoryColor } from "@/lib/constants/category.constants"
import { getTransactionTypeColor } from "@/lib/constants/transaction.constants"
import type { TransactionType } from "@/lib/constants/transaction.constants"

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: TransactionType
  currency?: string
  notes?: string
  tags?: string[]
  receiptUrl?: string
}

interface VirtualizedTransactionTableProps {
  transactions: Entry[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewReceipt?: (url: string) => void
  height?: number
  itemSize?: number
}

interface RowProps {
  transactions: Entry[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewReceipt?: (url: string) => void
}

export function VirtualizedTransactionTable({
  transactions,
  onEdit,
  onDelete,
  onViewReceipt,
  height = 600,
  itemSize = 80,
}: VirtualizedTransactionTableProps) {
  // Row component for the new react-window API
  const TransactionRow = ({ index, style, ariaAttributes }: RowComponentProps<RowProps>) => {
    const transaction = transactions[index]

    return (
      <div
        {...ariaAttributes}
        style={style}
        className="flex items-center gap-2 px-4 py-2 border-b hover:bg-muted/50 transition-colors"
      >
        {/* Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{transaction.description}</p>
              {transaction.notes && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {transaction.notes}
                </p>
              )}
              {transaction.tags && transaction.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {transaction.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {transaction.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{transaction.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
            {transaction.receiptUrl && onViewReceipt && (
              <button
                onClick={() => onViewReceipt(transaction.receiptUrl!)}
                className="flex-shrink-0 p-1 hover:bg-muted rounded"
                aria-label={`View receipt for ${transaction.description}`}
              >
                <FileImage className="h-4 w-4 text-primary" />
              </button>
            )}
          </div>
        </div>

        {/* Category */}
        <div className="w-32 flex-shrink-0">
          <Badge
            variant="secondary"
            className={`${getCategoryColor(transaction.category)} text-xs`}
          >
            {transaction.category}
          </Badge>
        </div>

        {/* Date */}
        <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
          {formatDateCompact(transaction.date)}
        </div>

        {/* Amount */}
        <div
          className={`w-32 flex-shrink-0 text-right font-semibold ${getTransactionTypeColor(transaction.type)}`}
        >
          {transaction.type === "income" ? "+" : "-"}
          {formatCurrency(transaction.amount, { currency: transaction.currency || "USD" })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(transaction.id)}
            aria-label={`Edit ${transaction.description}`}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(transaction.id)}
            aria-label={`Delete ${transaction.description}`}
            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b font-semibold text-sm">
        <div className="flex-1">Description</div>
        <div className="w-32 flex-shrink-0">Category</div>
        <div className="w-24 flex-shrink-0">Date</div>
        <div className="w-32 flex-shrink-0 text-right">Amount</div>
        <div className="w-20 flex-shrink-0 text-right">Actions</div>
      </div>

      {/* Virtualized List */}
      <div style={{ height }}>
        <List
          rowComponent={TransactionRow}
          rowCount={transactions.length}
          rowHeight={itemSize}
          rowProps={{ transactions, onEdit, onDelete, onViewReceipt }}
          style={{ width: "100%" }}
        />
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 bg-muted/30 border-t text-sm text-muted-foreground text-center">
        Showing {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        {transactions.length > 100 && " (virtualized for performance)"}
      </div>
    </div>
  )
}
