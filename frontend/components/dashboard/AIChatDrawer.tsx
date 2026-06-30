"use client"

/**
 * AI Budget Coach Chat Drawer
 *
 * A floating button that opens a Sheet-based chat interface.
 * The AI is grounded in the user's aggregated financial data
 * (no raw transaction descriptions are sent).
 *
 * Suggested prompts are shown when the conversation is empty.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Send, X, Bot, User, Sparkles } from "lucide-react"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { UpgradePrompt } from "@/components/ui/UpgradePrompt"

export function AIChatDrawer() {
  const [open, setOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [input, setInput] = useState("")
  const { isPro, loading: subscriptionLoading } = useSubscription()
  const t = useTranslations("insights")

  const SUGGESTED_PROMPTS = [
    t("suggestedPrompts.midMonth"),
    t("suggestedPrompts.cutBack"),
    t("suggestedPrompts.goals"),
    t("suggestedPrompts.lastMonth"),
  ]
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (deltaX > 60 && deltaY < deltaX) setOpen(false)
  }

  const { chatMessages, chatLoading, chatNotConfigured, sendMessage, clearChat } =
    useInsightsContext()

  // Auto-scroll on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, chatLoading, open])

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  // Listen for global open signal (e.g. from the nav sheet on any page)
  useEffect(() => {
    const handler = () => {
      if (subscriptionLoading) return
      if (isPro) setOpen(true)
      else setUpgradeOpen(true)
    }
    window.addEventListener("pocket:openAIChat", handler)
    return () => window.removeEventListener("pocket:openAIChat", handler)
  }, [isPro, subscriptionLoading])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || chatLoading) return
    setInput("")
    await sendMessage(text)
  }, [input, chatLoading, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <>
      {/* Upgrade dialog for free users */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-xs p-0" aria-describedby={undefined}>
          <UpgradePrompt
            mode="card"
            feature={t("chatFeature")}
            description={t("chatUpgradeDesc")}
          />
        </DialogContent>
      </Dialog>


      {/* Chat Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[420px] flex flex-col p-0 [&>button]:hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">{t("chatTitle")}</SheetTitle>
                <p className="text-xs text-muted-foreground">{t("chatPoweredBy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearChat}
                >
                  {t("chatClear")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
                aria-label={t("chatClose")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div data-scrollable aria-live="polite" className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 min-h-0">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="space-y-4">
                {/* Welcome message */}
                <div className="flex gap-2.5">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 rounded-2xl rounded-tl-none bg-muted px-3 py-2.5 text-sm">
                    {chatNotConfigured ? (
                      <p>
                        {t.rich("chatNotConfigured", {
                          code: (chunks) => (
                            <code className="text-xs bg-background px-1 rounded">{chunks}</code>
                          ),
                        })}
                      </p>
                    ) : (
                      <p>{t("chatWelcome")}</p>
                    )}
                  </div>
                </div>

                {/* Suggested prompts */}
                {!chatNotConfigured && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground px-0.5">
                      {t("chatTryAsking")}
                    </p>
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        disabled={chatLoading}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation */}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "bg-purple-100 dark:bg-purple-900"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-2xl px-3 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-tr-none"
                      : "bg-muted rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {chatLoading && (
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-muted px-3 py-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-4 py-3 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chatPlaceholder")}
              disabled={chatLoading || chatNotConfigured}
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || chatLoading || chatNotConfigured}
              className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
              aria-label={t("chatSend")}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
