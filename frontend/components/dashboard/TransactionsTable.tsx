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

interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
}

interface TransactionsTableProps {
  transactions: Transaction[]
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
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Card className="drop-shadow-xl shadow-black/10 dark:shadow-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </div>
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions yet. Add your first transaction to get started!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {transaction.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={categoryColors[transaction.category] || categoryColors.Other}
                    >
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      transaction.type === "income"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </TableCell>
                  <TableCell className="text-right">
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
        )}
      </CardContent>
    </Card>
  )
}

