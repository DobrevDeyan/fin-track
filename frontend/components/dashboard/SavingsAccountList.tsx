"use client"

import { SavingsAccountCard } from "./SavingsAccountCard"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"

type SavingsAccount = import("@/lib/firestore-types").SavingsAccountDocument & { id: string }

interface SavingsAccountListProps {
  accounts: SavingsAccount[]
  onEdit: (account: SavingsAccount) => void
  onDelete: (accountId: string) => void
  onAddMoney: (accountId: string, amount: number) => Promise<void>
  onWithdrawMoney: (accountId: string, amount: number) => Promise<void>
}

export function SavingsAccountList({
  accounts,
  onEdit,
  onDelete,
  onAddMoney,
  onWithdrawMoney,
}: SavingsAccountListProps) {
  const t = useTranslations("savings")
  const activeAccounts = accounts.filter((acc) => acc.isActive)

  // The empty (no accounts at all) state is handled by SavingsSection; this
  // branch only triggers when every account is inactive.
  if (activeAccounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
        {t("emptyDescription")}
      </p>
    )
  }

  return (
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
  )
}
