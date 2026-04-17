"use client"

import React, { ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/utils/logger"


interface Props {
  children: ReactNode
  /** Optional section name shown in the error card */
  label?: string
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Section-level React Error Boundary.
 *
 * Wraps individual dashboard sections so that a crash in one area does not
 * take down the entire dashboard. Renders a compact error card with a
 * "Reload section" button that resets the boundary without a full page reload.
 *
 * Usage:
 *   <SectionErrorBoundary label="Transactions">
 *     <TransactionsTable ... />
 *   </SectionErrorBoundary>
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(`${this.props.label ?? "Section"} crashed`, error, { critical: true, label: this.props.label, componentStack: info.componentStack })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col items-center gap-3 text-center my-2">
          <AlertCircle className="h-6 w-6 text-destructive/70" />
          <div>
            <p className="text-sm font-medium text-destructive/80">
              {this.props.label ? `${this.props.label} failed to load` : "This section failed to load"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="text-xs h-7"
          >
            Reload section
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
