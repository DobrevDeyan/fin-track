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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageCircle, Send, X, Bot, User, Sparkles } from "lucide-react"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"

const SUGGESTED_PROMPTS = [
  "Why am I running out of money mid-month?",
  "Which category should I cut back on?",
  "Am I on track to meet my savings goals?",
  "How does my spending compare to last month?",
]

export function AIChatDrawer() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
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
      {/* Floating button — bottom-left corner, balancing the "+" FAB on the right */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Open AI Budget Coach"
      >
        <MessageCircle className="h-6 w-6" />
        {chatMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {chatMessages.filter((m) => m.role === "assistant").length}
          </span>
        )}
      </button>

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
                <SheetTitle className="text-sm font-semibold">AI Budget Coach</SheetTitle>
                <p className="text-xs text-muted-foreground">Powered by Gemini</p>
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
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
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
                        AI features need a{" "}
                        <span className="font-medium">Gemini API key</span>. Get one
                        free at{" "}
                        <code className="text-xs bg-background px-1 rounded">
                          aistudio.google.com
                        </code>{" "}
                        and add it to the ML service.
                      </p>
                    ) : (
                      <p>
                        Hi! I&apos;m your AI Budget Coach. Ask me anything about
                        your finances — I&apos;m grounded in your actual spending
                        data.
                      </p>
                    )}
                  </div>
                </div>

                {/* Suggested prompts */}
                {!chatNotConfigured && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground px-0.5">
                      Try asking:
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
              placeholder="Ask about your finances…"
              disabled={chatLoading || chatNotConfigured}
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || chatLoading || chatNotConfigured}
              className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
