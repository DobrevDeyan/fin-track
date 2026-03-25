"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Calendar, Repeat } from "lucide-react"
import { RecurringEntryDocument } from "@/lib/firestore-types"
import { formatCurrency } from "@/lib/currency-utils"
import { getTransactionTypeColor } from "@/lib/constants/transaction.constants"
import { useTranslations } from "next-intl"
import type { BudgetPeriod } from "@/lib/constants/budget.constants"
import { motion } from "framer-motion"

interface RecurringTransactionCardProps {
  recurring: RecurringEntryDocument & { id: string }
  onEdit: (recurring: RecurringEntryDocument & { id: string }) => void
  onDelete: (recurringId: string) => Promise<void>
  userCurrency?: string
}

export function RecurringTransactionCard({
  recurring,
  onEdit,
  onDelete,
  userCurrency = "EUR",
}: RecurringTransactionCardProps) {
  const t = useTranslations("recurring")
  const tCommon = useTranslations("common")

  const nextDate = recurring.nextDate.toDate()
  const formattedDate = nextDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
    <Card className={`${!recurring.isActive ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{recurring.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{recurring.category}</p>
          </div>
          {!recurring.isActive && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
              {tCommon("inactive")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tCommon("amount")}</span>
            <span className={`font-semibold ${getTransactionTypeColor(recurring.type)}`}>
              {recurring.type === "expense" ? "-" : "+"}
              {formatCurrency(recurring.amount, { currency: userCurrency })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Repeat className="h-4 w-4" />
            <span>{tCommon(recurring.frequency as BudgetPeriod)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{t("next")}: {formattedDate}</span>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(recurring)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {tCommon("edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(recurring.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {tCommon("delete")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}
