"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, FileImage } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  tags?: string[]
  receiptUrl?: string
}

interface TransactionsTableProps {
  transactions: Entry[]
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  filters?: React.ReactNode
}

const ITEMS_PER_PAGE = 10

export function TransactionsTable({
  transactions,
  onAdd,
  onEdit,
  onDelete,
  filters,
}: TransactionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null)

  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTransactions = useMemo(() => {
    return transactions.slice(startIndex, endIndex)
  }, [transactions, startIndex, endIndex])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [transactions.length, currentPage, totalPages])

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i)
        }
        pages.push("ellipsis")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push("ellipsis")
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // In the middle
        pages.push("ellipsis")
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push("ellipsis")
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <Card className="drop-shadow-xl shadow-black/10 mb-8">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Recent Entries</CardTitle>
              <CardDescription className="mt-1">
                Your latest financial activity
                {transactions.length > 0 && (
                  <span className="ml-2">
                    ({transactions.length} {transactions.length === 1 ? "entry" : "entries"})
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={onAdd} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </div>
          {filters && (
            <div className="pt-2 border-t">
              {filters}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 md:px-6">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No entries yet. Add your first entry to get started!
          </div>
        ) : (
          <>
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
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium py-2 sm:py-4">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            {transaction.description}
                            {transaction.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {transaction.notes}
                              </p>
                            )}
                            {transaction.tags && transaction.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {transaction.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs font-normal"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {transaction.receiptUrl && (
                            <button
                              onClick={() => {
                                setSelectedReceiptUrl(transaction.receiptUrl || null)
                                setReceiptDialogOpen(true)
                              }}
                              className="flex-shrink-0 p-1 hover:bg-muted rounded"
                              title="View receipt"
                            >
                              <FileImage className="h-4 w-4 text-primary" />
                            </button>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        )
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageClick(page as number)}
                          className="min-w-[2.5rem]"
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {/* Receipt View Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {selectedReceiptUrl && (
            <div className="mt-4">
              <img
                src={selectedReceiptUrl}
                alt="Receipt"
                className="max-w-full h-auto rounded-md border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

