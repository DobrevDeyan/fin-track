"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { CreditCard } from "lucide-react"
import { toast } from "sonner"

interface BillingPortalButtonProps {
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

export function BillingPortalButton({
  label = "Manage Billing",
  variant = "outline",
  size = "default",
}: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)

    try {
      const createPortalLink = httpsCallable<
        { returnUrl: string },
        { url: string }
      >(functions, "ext-firestore-stripe-payments-createPortalLink")

      const { data } = await createPortalLink({
        returnUrl: `${window.location.origin}/settings`,
      })

      window.location.assign(data.url)
    } catch (error) {
      console.error("Error creating billing portal link:", error)
      toast.error("Failed to open billing portal. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2"
    >
      <CreditCard className="h-4 w-4" />
      {loading ? "Loading..." : label}
    </Button>
  )
}
