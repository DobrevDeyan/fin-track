"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useAccent, ACCENT_PRESETS, type AccentKey } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

interface ThemeControlsProps {
  /** Show labels beside the controls (default: true) */
  showLabels?: boolean
  /** Compact layout - stacks toggle + swatches side-by-side in one row */
  compact?: boolean
}

export function ThemeControls({ showLabels = true, compact = false }: ThemeControlsProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
  const isDark = resolvedTheme === "dark"

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4">
        {/* Toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            "bg-muted hover:bg-muted/80 text-foreground"
          )}
          aria-label="Toggle theme"
        >
          {isDark
            ? <><Moon className="h-3.5 w-3.5" /> Dark</>
            : <><Sun className="h-3.5 w-3.5" /> Light</>
          }
        </button>

        {/* Accent swatches */}
        <div className="flex items-center gap-1.5">
          {(Object.entries(ACCENT_PRESETS) as [AccentKey, typeof ACCENT_PRESETS[AccentKey]][]).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setAccent(key)}
              title={preset.name}
              aria-label={`Accent: ${preset.name}`}
              className={cn(
                "w-5 h-5 rounded-full transition-all duration-150 shrink-0",
                accent === key
                  ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                  : "hover:scale-110 opacity-70 hover:opacity-100"
              )}
              style={{
                backgroundColor: preset.preview,
                // @ts-ignore
                "--tw-ring-color": preset.preview,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Dark / Light toggle */}
      <div className="flex items-center justify-between">
        {showLabels && (
          <span className="text-sm font-medium text-foreground/70">Appearance</span>
        )}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            "bg-muted hover:bg-muted/80 text-foreground"
          )}
          aria-label="Toggle dark/light mode"
        >
          {isDark ? (
            <><Moon className="h-4 w-4" /> Dark mode</>
          ) : (
            <><Sun className="h-4 w-4" /> Light mode</>
          )}
        </button>
      </div>

      {/* Accent color */}
      <div>
        {showLabels && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground/70">Accent color</span>
            <span className="text-xs text-muted-foreground">
              {ACCENT_PRESETS[accent].name}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {(Object.entries(ACCENT_PRESETS) as [AccentKey, typeof ACCENT_PRESETS[AccentKey]][]).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setAccent(key)}
              title={preset.name}
              aria-label={`Accent: ${preset.name}`}
              className={cn(
                "w-7 h-7 rounded-full transition-all duration-150 shrink-0",
                accent === key
                  ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                  : "hover:scale-110 opacity-60 hover:opacity-90"
              )}
              style={{
                backgroundColor: preset.preview,
                // @ts-ignore
                "--tw-ring-color": preset.preview,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
