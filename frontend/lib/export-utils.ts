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

/**
 * Convert entries to CSV format
 */
export function entriesToCSV(entries: Entry[]): string {
  // CSV header
  const headers = ["Date", "Type", "Description", "Category", "Amount", "Notes"]
  
  // CSV rows
  const rows = entries.map((entry) => {
    const date = new Date(entry.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const type = entry.type.charAt(0).toUpperCase() + entry.type.slice(1)
    const description = escapeCSV(entry.description)
    const category = escapeCSV(entry.category)
    const amount = entry.type === "expense" ? `-${entry.amount.toFixed(2)}` : entry.amount.toFixed(2)
    const notes = escapeCSV(entry.notes || "")
    
    return [date, type, description, category, amount, notes]
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
export function exportEntriesToCSV(entries: Entry[], filename?: string): void {
  const csvContent = entriesToCSV(entries)
  const defaultFilename = `fintrack-export-${new Date().toISOString().split("T")[0]}.csv`
  downloadCSV(csvContent, filename || defaultFilename)
}

