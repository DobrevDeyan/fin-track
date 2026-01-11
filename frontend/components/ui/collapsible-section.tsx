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

  return (
    <div className={cn("mb-8", className)}>
      <Accordion type="single" collapsible defaultValue={defaultValue} className="w-full">
        <AccordionItem value="section" className="border rounded-lg px-4 md:px-6 bg-card">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 w-full text-left">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              {actionButton && (
                <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
                  {actionButton}
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-4">
              {actionButton && (
                <div className="mb-4 md:hidden" onClick={(e) => e.stopPropagation()}>
                  {actionButton}
                </div>
              )}
              {children}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
