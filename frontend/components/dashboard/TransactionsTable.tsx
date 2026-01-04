"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatAmount } from "@/lib/currency-utils"
import { formatDate, formatDateCompact } from "@/lib/date-utils"
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
}

interface TransactionsTableProps {
  transactions: Entry[]
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function TransactionsTable({
  transactions,
  onAdd,
  onEdit,
  onDelete,
}: TransactionsTableProps) {

  return (
    <Card className="drop-shadow-xl shadow-black/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold">Recent Entries</CardTitle>
            <CardDescription className="mt-1">Your latest financial activity</CardDescription>
          </div>
          <Button onClick={onAdd} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 md:px-6">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No entries yet. Add your first entry to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 sm:py-4">Description</TableHead>
                  <TableHead className="py-2 sm:py-4">Category</TableHead>
                  <TableHead className="py-2 sm:py-4">Date</TableHead>
                  <TableHead className="text-right py-2 sm:py-4 min-w-[120px] sm:min-w-[140px]">Amount</TableHead>
                  <TableHead className="text-right py-2 sm:py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium py-2 sm:py-4">
                      <div>
                        {transaction.description}
                        {transaction.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {transaction.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 sm:py-4">
                      <Badge
                        variant="secondary"
                        className={getCategoryColor(transaction.category)}
                      >
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-2 sm:py-4 whitespace-nowrap min-w-[110px]">
                      <span className="hidden sm:inline">{formatDate(transaction.date)}</span>
                      <span className="sm:hidden">{formatDateCompact(transaction.date)}</span>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold p-2 sm:p-4 min-h-[2.5rem] sm:min-h-0 min-w-[120px] sm:min-w-[140px] ${getTransactionTypeColor(transaction.type)}`}
                    >
                      <span className="inline-block leading-loose align-middle py-0.5">
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(Math.abs(transaction.amount), { currency: transaction.currency || "EUR" })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-2 sm:py-4">
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(transaction.id)}
                          className="hover:bg-primary/10"
                          title="Edit entry"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm(`Are you sure you want to delete "${transaction.description}"? This action cannot be undone.`)) {
                              onDelete(transaction.id)
                            }
                          }}
                          className="hover:bg-destructive/10 hover:text-destructive"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

