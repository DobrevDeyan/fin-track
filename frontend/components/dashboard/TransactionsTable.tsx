"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, FileImage, ChevronDown, ChevronUp, Receipt, Zap, FileUp } from "lucide-react"
import { VirtualizedTransactionTable } from "./VirtualizedTransactionTable"
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
import { useTranslations } from "next-intl"

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
  onImportCSV?: () => void
  filters?: React.ReactNode
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
}

const INITIAL_VISIBLE = 2
const EXPANDED_VISIBLE = 20
const ITEMS_PER_PAGE = 20
const VIRTUALIZATION_THRESHOLD = 100 // Use virtualization for 100+ transactions

export function TransactionsTable({
  transactions,
  onAdd,
  onEdit,
  onDelete,
  onImportCSV,
  filters,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: TransactionsTableProps) {
  const t = useTranslations("dashboard")
  const tCommon = useTranslations("common")
  const [expanded, setExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>("")
  const [useVirtualization, setUseVirtualization] = useState(false)

  // Automatically enable virtualization for large datasets
  const shouldVirtualize = transactions.length >= VIRTUALIZATION_THRESHOLD

  // Calculate visible count based on expanded state
  const visibleCount = expanded ? EXPANDED_VISIBLE : INITIAL_VISIBLE

  // Calculate pagination (only when expanded and more than EXPANDED_VISIBLE)
  const totalPages = expanded ? Math.ceil(transactions.length / ITEMS_PER_PAGE) : 1
  const startIndex = expanded ? (currentPage - 1) * ITEMS_PER_PAGE : 0
  const endIndex = expanded ? startIndex + ITEMS_PER_PAGE : INITIAL_VISIBLE
  const paginatedTransactions = useMemo(() => {
    if (onLoadMore) return transactions.slice(0, visibleCount);
    return transactions.slice(startIndex, Math.min(endIndex, transactions.length))
  }, [transactions, startIndex, endIndex, onLoadMore, visibleCount])

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
              <CardTitle className="text-xl font-bold">{t("recentEntries")}</CardTitle>
              <CardDescription className="mt-1">
                {t("latestActivity")}
                {transactions.length > 0 && (
                  <span className="ml-2">
                    ({transactions.length} {transactions.length === 1 ? t("entry") : t("entries")})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {onImportCSV && (
                <Button variant="outline" onClick={onImportCSV} className="gap-2 flex-1 sm:flex-none">
                  <FileUp className="h-4 w-4" />
                  Import CSV
                </Button>
              )}
              <Button onClick={onAdd} className="gap-2 flex-1 sm:flex-none">
                <Plus className="h-4 w-4" />
                {t("addEntry")}
              </Button>
            </div>
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
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Receipt className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("noEntriesYet")}</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              {t("noEntriesDescription")}
            </p>
            <Button onClick={onAdd} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              {t("addFirstEntry")}
            </Button>
          </div>
        ) : shouldVirtualize && (useVirtualization || expanded) ? (
          <div className="space-y-4">
            {shouldVirtualize && !useVirtualization && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-600 dark:text-blue-400 flex-1">
                  Performance mode enabled for {transactions.length} transactions
                </p>
              </div>
            )}
            <VirtualizedTransactionTable
              transactions={paginatedTransactions}
              onEdit={onEdit}
              onDelete={(id) => {
                const transaction = transactions.find(t => t.id === id)
                if (transaction) {
                  setDeleteConfirmId(id)
                  setDeleteConfirmName(transaction.description)
                }
              }}
              onViewReceipt={(url) => {
                setSelectedReceiptUrl(url)
                setReceiptDialogOpen(true)
              }}
              height={600}
              itemSize={100}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 sm:py-4">{tCommon("description")}</TableHead>
                    <TableHead className="py-2 sm:py-4">{tCommon("category")}</TableHead>
                    <TableHead className="py-2 sm:py-4">{tCommon("date")}</TableHead>
                    <TableHead className="text-right py-2 sm:py-4 min-w-[120px] sm:min-w-[140px]">{tCommon("amount")}</TableHead>
                    <TableHead className="text-right py-2 sm:py-4">{tCommon("actions")}</TableHead>
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
                              aria-label={`${t("viewReceipt")}: ${transaction.description}`}
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
                            aria-label={`${t("editEntryTitle")}: ${transaction.description}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(transaction.id)
                              setDeleteConfirmName(transaction.description)
                            }}
                            className="hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`${t("deleteEntryTitle")}: ${transaction.description}`}
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

            {/* Expand/Collapse & Pagination Controls */}
            <div className="flex flex-col items-center gap-4 mt-4 pt-4 border-t">
              {/* Show more / Show less toggle */}
              {transactions.length > INITIAL_VISIBLE && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpanded(!expanded)
                    setCurrentPage(1)
                  }}
                  className="gap-1 text-muted-foreground"
                >
                  {expanded ? (
                    <>
                      {t("showLess")}
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      {t("showMore", { count: Math.min(transactions.length, EXPANDED_VISIBLE) })}
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}

              {/* Pagination - only when expanded and there are more than EXPANDED_VISIBLE */}
              {expanded && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                  <div className="text-sm text-muted-foreground">
                    {t("showingEntries", { from: startIndex + 1, to: Math.min(endIndex, transactions.length), total: transactions.length })}
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
                      <span className="hidden sm:inline">{tCommon("previous")}</span>
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
                      <span className="hidden sm:inline">{tCommon("next")}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Server-side load more (for fetching additional data from Firestore) */}
              {expanded && onLoadMore && hasMore && (
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="min-w-[120px]"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      {tCommon("loading")}
                    </>
                  ) : (
                    tCommon("loadMore")
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="sm:max-w-[400px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("deleteEntryTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t("confirmDelete", { name: deleteConfirmName })}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) onDelete(deleteConfirmId)
                setDeleteConfirmId(null)
              }}
            >
              {tCommon("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt View Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("receipt")}</DialogTitle>
          </DialogHeader>
          {selectedReceiptUrl && (
            <div className="mt-4">
              <img
                src={selectedReceiptUrl}
                alt={t("receiptPreview")}
                className="max-w-full h-auto rounded-md border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

