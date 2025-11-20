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

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
}

interface TransactionsTableProps {
  transactions: Entry[]
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const categoryColors: Record<string, string> = {
  "Food & Dining": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Shopping": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Transportation": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Bills & Utilities": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Entertainment": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Salary": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "Other": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export function TransactionsTable({
  transactions,
  onAdd,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatDateCompact = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Card className="drop-shadow-xl shadow-black/10 dark:shadow-white/10">
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
      <CardContent className="px-4 sm:px-6">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No entries yet. Add your first entry to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-4">Description</TableHead>
                  <TableHead className="py-4">Category</TableHead>
                  <TableHead className="py-4">Date</TableHead>
                  <TableHead className="text-right py-4">Amount</TableHead>
                  <TableHead className="text-right py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium py-4">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="secondary"
                        className={categoryColors[transaction.category] || categoryColors.Other}
                      >
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-4 whitespace-nowrap min-w-[110px]">
                      <span className="hidden sm:inline">{formatDate(transaction.date)}</span>
                      <span className="sm:hidden">{formatDateCompact(transaction.date)}</span>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold py-4 ${
                        transaction.type === "income"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(transaction.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(transaction.id)}
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

