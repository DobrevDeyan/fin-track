/**
 * PDF Export utilities for reports
 */

import { formatCurrency } from './currency-utils'
import { formatSavingsRate } from './metrics-utils'

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: 'income' | 'expense'
  notes?: string
}

interface ReportMetrics {
  income: number
  expenses: number
  balance: number
  savingsRate: number
  categoryBreakdown: Record<string, number>
  monthlyBreakdown: Record<string, { income: number; expenses: number }>
  totalTransactions: number
}

interface PDFExportOptions {
  entries: Entry[]
  metrics: ReportMetrics
  startDate: string
  endDate: string
  reportType: 'yearly' | 'monthly' | 'custom'
  userEmail?: string
  currency?: string
  /** Convert a stored EUR-base amount to the display currency. Identity if omitted. (RA-1) */
  convertFromBase?: (eurAmount: number) => number
  /** BCP-47 locale for date/number formatting. (RA-20) */
  locale?: string
}

/**
 * Format date for display
 */
function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: string, endDate: string, locale: string): string {
  return `${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}`
}

/**
 * Export report to PDF
 */
export async function exportReportToPDF(options: PDFExportOptions): Promise<void> {
  const {
    entries,
    metrics,
    startDate,
    endDate,
    reportType,
    userEmail,
    currency = 'EUR',
    convertFromBase = (x: number) => x,
    locale = 'en-US',
  } = options

  // Amounts in `metrics`/`entries` are stored in EUR base; convert to the
  // display currency before formatting so the PDF matches the on-screen cards. (RA-1)
  const money = (eurAmount: number) =>
    formatCurrency(convertFromBase(eurAmount), { currency, locale })

  // Dynamically import heavy PDF libraries only when needed
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Colors (RGB tuples)
  const primaryColor: [number, number, number] = [59, 130, 246] // blue-500
  const successColor: [number, number, number] = [34, 197, 94] // green-500
  const dangerColor: [number, number, number] = [239, 68, 68] // red-500
  const textColor: [number, number, number] = [31, 41, 55] // gray-800
  const mutedColor: [number, number, number] = [107, 114, 128] // gray-500

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Title
  doc.setFontSize(24)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setFont('helvetica', 'bold')
  doc.text('Financial Report', margin, yPosition)
  yPosition += 10

  // Date range and report type
  doc.setFontSize(10)
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
  doc.setFont('helvetica', 'normal')
  const reportTypeLabel =
    reportType === 'yearly' ? 'This Year' : reportType === 'monthly' ? 'This Month' : 'Custom Range'
  doc.text(`Period: ${reportTypeLabel}`, margin, yPosition)
  yPosition += 5
  doc.text(formatDateRange(startDate, endDate, locale), margin, yPosition)
  yPosition += 5
  if (userEmail) {
    doc.text(`Generated for: ${userEmail}`, margin, yPosition)
    yPosition += 5
  }
  doc.text(`Generated on: ${new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, margin, yPosition)
  yPosition += 12

  // Summary Metrics
  doc.setFontSize(16)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', margin, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const metricsData: Array<[string, string, [number, number, number]]> = [
    ['Total Income', money(metrics.income), successColor],
    ['Total Expenses', money(metrics.expenses), dangerColor],
    [
      'Net Balance',
      money(metrics.balance),
      metrics.balance >= 0 ? successColor : dangerColor,
    ],
    ['Savings Rate', formatSavingsRate(metrics.income, metrics.expenses), textColor],
    ['Total Transactions', metrics.totalTransactions.toString(), textColor],
  ]

  metricsData.forEach(([label, value, color]) => {
    checkPageBreak(7)
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    doc.text(label + ':', margin, yPosition)
    doc.setTextColor(color[0], color[1], color[2])
    doc.setFont('helvetica', 'bold')
    const textWidth = doc.getTextWidth(value)
    doc.text(value, pageWidth - margin - textWidth, yPosition)
    doc.setFont('helvetica', 'normal')
    yPosition += 6
  })

  yPosition += 8

  // Category Breakdown Table
  if (Object.keys(metrics.categoryBreakdown).length > 0) {
    checkPageBreak(30)
    doc.setFontSize(16)
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Category Breakdown', margin, yPosition)
    yPosition += 8

    const categoryData = Object.entries(metrics.categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => {
        // Guard divide-by-zero (e.g. a 0-amount expense) → "0.0%" not "NaN%". (RA-14)
        const percentage = metrics.expenses > 0 ? ((amount / metrics.expenses) * 100).toFixed(1) : '0.0'
        return [category, money(amount), `${percentage}%`]
      })

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor as any,
        textColor: [255, 255, 255] as any,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right', cellWidth: 50 },
        2: { halign: 'right', cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Monthly Trends Table
  if (Object.keys(metrics.monthlyBreakdown).length > 0) {
    checkPageBreak(30)
    doc.setFontSize(16)
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Monthly Trends', margin, yPosition)
    yPosition += 8

    const monthlyData = Object.entries(metrics.monthlyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-')
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(locale, {
          month: 'long',
          year: 'numeric',
        })
        const net = data.income - data.expenses
        return [
          monthName,
          money(data.income),
          money(data.expenses),
          money(net),
        ]
      })

    autoTable(doc, {
      startY: yPosition,
      head: [['Month', 'Income', 'Expenses', 'Net']],
      body: monthlyData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor as any,
        textColor: [255, 255, 255] as any,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'right', cellWidth: 40 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'right', cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Transaction List (optional - can be very long, so we'll add a summary table)
  if (entries.length > 0 && entries.length <= 50) {
    // Only include transaction list if there are 50 or fewer transactions
    checkPageBreak(30)
    doc.setFontSize(16)
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Transaction Details', margin, yPosition)
    yPosition += 8

    const transactionData = entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50) // Limit to 50 transactions
      .map((entry) => {
        const date = new Date(entry.date).toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        const amount = money(entry.amount)
        const type = entry.type === 'income' ? 'Income' : 'Expense'
        const description = entry.description.length > 30 ? entry.description.substring(0, 30) + '...' : entry.description
        return [date, type, description, entry.category, amount]
      })

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
      body: transactionData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor as any,
        textColor: [255, 255, 255] as any,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 },
      },
      margin: { left: margin, right: margin },
    })
  } else if (entries.length > 50) {
    // If more than 50 transactions, add a note
    checkPageBreak(15)
    doc.setFontSize(10)
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    doc.setFont('helvetica', 'italic')
    doc.text(
      `Note: ${entries.length} transactions in this period. Export to CSV for full transaction list.`,
      margin,
      yPosition,
    )
  }

  // Footer on last page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.getHeight() - 10)
    doc.text('FinTrack', margin, doc.internal.pageSize.getHeight() - 10)
  }

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0]
  const reportTypeStr = reportType === 'yearly' ? 'yearly' : reportType === 'monthly' ? 'monthly' : 'custom'
  const filename = `fintrack-report-${reportTypeStr}-${dateStr}.pdf`

  // Save PDF
  doc.save(filename)
}

