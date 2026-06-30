/**
 * Export utilities for CSV export functionality
 */

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  notes?: string
}

interface CSVExportOptions {
  /** Convert a stored EUR-base amount to the display currency. Identity if omitted. (RA-2) */
  convertFromBase?: (eurAmount: number) => number
  /** ISO 4217 code written into the Currency column (e.g. "EUR", "USD"). */
  currency?: string
  /** BCP-47 locale for date formatting. */
  locale?: string
}

/**
 * Convert entries to CSV format.
 *
 * Amounts are converted from EUR base to the display currency and a Currency
 * column is included, so the exported numbers are unambiguous and match the
 * on-screen values instead of silently being raw EUR. (RA-2)
 */
export function entriesToCSV(entries: Entry[], options: CSVExportOptions = {}): string {
  const { convertFromBase = (x: number) => x, currency = "EUR", locale = "en-US" } = options

  // CSV header
  const headers = ["Date", "Type", "Description", "Category", "Amount", "Currency", "Notes"]

  // CSV rows
  const rows = entries.map((entry) => {
    const date = new Date(entry.date).toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const type = entry.type.charAt(0).toUpperCase() + entry.type.slice(1)
    const description = escapeCSV(entry.description)
    const category = escapeCSV(entry.category)
    const converted = convertFromBase(entry.amount)
    // Keep a period decimal separator regardless of locale so the CSV parses cleanly.
    const amount = entry.type === "expense" ? `-${converted.toFixed(2)}` : converted.toFixed(2)
    const notes = escapeCSV(entry.notes || "")

    return [date, type, description, category, amount, currency, notes]
  })

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n")

  return csvContent
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (!value) return ""
  // Replace quotes with double quotes and wrap in quotes if contains comma, newline, or quote
  return value.replace(/"/g, '""')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = "transactions.csv"): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export entries to CSV and download
 */
export function exportEntriesToCSV(
  entries: Entry[],
  filename?: string,
  options?: CSVExportOptions
): void {
  const csvContent = entriesToCSV(entries, options)
  const defaultFilename = `fintrack-export-${new Date().toISOString().split("T")[0]}.csv`
  downloadCSV(csvContent, filename || defaultFilename)
}
