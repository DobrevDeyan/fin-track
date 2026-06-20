"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SavingsAccountCard } from "./SavingsAccountCard"
import { Card, CardContent } from "@/components/ui/card"
import { useMoney } from "@/contexts/CurrencyContext"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"

type SavingsAccount = import("@/lib/firestore-types").SavingsAccountDocument & { id: string }

interface SavingsAccountListProps {
  accounts: SavingsAccount[]
  onAdd: () => void
  onEdit: (account: SavingsAccount) => void
  onDelete: (accountId: string) => void
  onAddMoney: (accountId: string, amount: number) => Promise<void>
  onWithdrawMoney: (accountId: string, amount: number) => Promise<void>
  defaultCurrency?: string
  hideHeader?: boolean
}

export function SavingsAccountList({
  accounts,
  onAdd,
  onEdit,
  onDelete,
  onAddMoney,
  onWithdrawMoney,
  defaultCurrency,
  hideHeader = false,
}: SavingsAccountListProps) {
  const t = useTranslations("savings")
  const { format } = useMoney()
  const activeAccounts = accounts.filter((acc) => acc.isActive)
  const totalSavings = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0)

  if (activeAccounts.length === 0) {
    return (
      <div className="space-y-4">
        {!hideHeader && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
              <p className="text-muted-foreground mt-1">
                {t("description")}
              </p>
            </div>
            <Button onClick={onAdd} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t("createAccount")}
            </Button>
          </div>
        )}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
            <p className="text-sm md:text-base text-muted-foreground text-center mb-4 md:mb-6 max-w-md md:max-w-lg px-4">
              {t("emptyDesc")}
            </p>
            <Button onClick={onAdd} size="default" className="md:text-base">
              <Plus className="mr-2 h-4 w-4" />
              {t("createFirst")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
            <p className="text-muted-foreground mt-1">
              {t("totalSavings")}:{" "}
              <span className="font-semibold text-foreground">
                {format(totalSavings)}
              </span>
            </p>
          </div>
          <Button onClick={onAdd} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t("createAccount")}
          </Button>
        </div>
      )}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeAccounts.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
          >
            <SavingsAccountCard
              account={account}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddMoney={onAddMoney}
              onWithdrawMoney={onWithdrawMoney}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

