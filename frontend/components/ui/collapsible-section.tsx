"use client"

import * as React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  actionButton?: React.ReactNode
}

export function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  className,
  actionButton,
}: CollapsibleSectionProps) {
  const defaultValue = defaultOpen ? "section" : undefined

  // Clone the button for desktop to ensure it's a separate instance
  const desktopButton = actionButton && React.isValidElement(actionButton)
    ? React.cloneElement(actionButton as React.ReactElement, { key: 'desktop-button' })
    : actionButton

  return (
    <div className={cn("mb-4 md:mb-8", className)}>
      <div className="border rounded-lg px-4 md:px-6 bg-card">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 py-3 md:py-4">
          <div className="flex-1 min-w-0 w-full md:pr-6 overflow-hidden relative">
            <Accordion type="single" collapsible defaultValue={defaultValue} className="w-full">
              <AccordionItem value="section" className="border-0">
                <AccordionTrigger className="hover:no-underline text-left py-0 h-auto [&>svg]:ml-auto [&>svg]:shrink-0 [&>header]:max-w-full [&>header]:overflow-hidden [&>header]:pointer-events-none [&>header>button]:pointer-events-auto">
                  <div className="flex flex-col gap-1.5 md:gap-2 text-left pr-2 md:pr-6 flex-1 min-w-0">
                    <h2 className="text-lg md:text-2xl font-bold">{title}</h2>
                    {description && (
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{description}</p>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  <div className="pt-2 md:pt-6 pb-2 md:pb-6">
                    {actionButton && (
                      <div className="mb-3 md:mb-4 md:hidden">
                        {actionButton}
                      </div>
                    )}
                    {children}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          {desktopButton && (
            <div className="hidden md:flex items-start shrink-0 pt-1 relative z-50" style={{ pointerEvents: 'auto' }}>
              {desktopButton}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
