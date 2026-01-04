/**
 * Unit tests for metrics-utils.ts
 */

import {
  calculateMetrics,
  filterEntriesByMonth,
  getCurrentMonthEntries,
  getPreviousMonthEntries,
  calculateChange,
  calculateMetricsWithComparison,
} from '@/lib/metrics-utils'
import { Entry } from '@/lib/types'

describe('metrics-utils', () => {
  const mockEntries: Entry[] = [
    {
      id: '1',
      type: 'income',
      amount: 1000,
      description: 'Salary',
      category: 'Salary',
      date: '2024-06-15',
    },
    {
      id: '2',
      type: 'expense',
      amount: 200,
      description: 'Groceries',
      category: 'Food & Dining',
      date: '2024-06-20',
    },
    {
      id: '3',
      type: 'expense',
      amount: 150,
      description: 'Gas',
      category: 'Transportation',
      date: '2024-06-25',
    },
    {
      id: '4',
      type: 'income',
      amount: 500,
      description: 'Freelance',
      category: 'Freelance',
      date: '2024-05-10',
    },
    {
      id: '5',
      type: 'expense',
      amount: 100,
      description: 'Coffee',
      category: 'Food & Dining',
      date: '2024-05-15',
    },
  ]

  describe('calculateMetrics', () => {
    it('should calculate total income correctly', () => {
      const metrics = calculateMetrics(mockEntries)
      expect(metrics.totalIncome).toBe(1500) // 1000 + 500
    })

    it('should calculate total expenses correctly', () => {
      const metrics = calculateMetrics(mockEntries)
      expect(metrics.totalExpenses).toBe(450) // 200 + 150 + 100
    })

    it('should calculate total balance correctly', () => {
      const metrics = calculateMetrics(mockEntries)
      expect(metrics.totalBalance).toBe(1050) // 1500 - 450
    })

    it('should calculate savings as balance', () => {
      const metrics = calculateMetrics(mockEntries)
      expect(metrics.savings).toBe(1050)
    })

    it('should handle empty entries', () => {
      const metrics = calculateMetrics([])
      expect(metrics.totalIncome).toBe(0)
      expect(metrics.totalExpenses).toBe(0)
      expect(metrics.totalBalance).toBe(0)
      expect(metrics.savings).toBe(0)
    })

    it('should handle only income entries', () => {
      const incomeOnly: Entry[] = [
        {
          id: '1',
          type: 'income',
          amount: 1000,
          description: 'Salary',
          category: 'Salary',
          date: '2024-06-15',
        },
      ]
      const metrics = calculateMetrics(incomeOnly)
      expect(metrics.totalIncome).toBe(1000)
      expect(metrics.totalExpenses).toBe(0)
      expect(metrics.totalBalance).toBe(1000)
    })

    it('should handle only expense entries', () => {
      const expenseOnly: Entry[] = [
        {
          id: '1',
          type: 'expense',
          amount: 500,
          description: 'Groceries',
          category: 'Food & Dining',
          date: '2024-06-15',
        },
      ]
      const metrics = calculateMetrics(expenseOnly)
      expect(metrics.totalIncome).toBe(0)
      expect(metrics.totalExpenses).toBe(500)
      expect(metrics.totalBalance).toBe(-500)
    })
  })

  describe('filterEntriesByMonth', () => {
    it('should filter entries by month and year', () => {
      const juneEntries = filterEntriesByMonth(mockEntries, 5, 2024) // June (0-indexed)
      expect(juneEntries).toHaveLength(3) // 3 entries in June
      expect(juneEntries.every(e => {
        const date = new Date(e.date)
        return date.getMonth() === 5 && date.getFullYear() === 2024
      })).toBe(true)
    })

    it('should filter entries for May', () => {
      const mayEntries = filterEntriesByMonth(mockEntries, 4, 2024) // May (0-indexed)
      expect(mayEntries).toHaveLength(2) // 2 entries in May
    })

    it('should return empty array for month with no entries', () => {
      const januaryEntries = filterEntriesByMonth(mockEntries, 0, 2024)
      expect(januaryEntries).toHaveLength(0)
    })
  })

  describe('getCurrentMonthEntries', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return entries for current month', () => {
      const currentEntries = getCurrentMonthEntries(mockEntries)
      expect(currentEntries).toHaveLength(3) // 3 entries in June
      expect(currentEntries.every(e => {
        const date = new Date(e.date)
        return date.getMonth() === 5 && date.getFullYear() === 2024 // June (0-indexed)
      })).toBe(true)
    })
  })

  describe('getPreviousMonthEntries', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return entries for previous month', () => {
      const previousEntries = getPreviousMonthEntries(mockEntries)
      expect(previousEntries).toHaveLength(2) // 2 entries in May
      expect(previousEntries.every(e => {
        const date = new Date(e.date)
        return date.getMonth() === 4 && date.getFullYear() === 2024 // May (0-indexed)
      })).toBe(true)
    })

    it('should handle January (year boundary)', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      const previousEntries = getPreviousMonthEntries(mockEntries)
      // Should look for December 2023
      expect(previousEntries).toBeDefined()
    })
  })

  describe('calculateChange', () => {
    it('should calculate positive change correctly', () => {
      const change = calculateChange(200, 100)
      expect(change.trend).toBe('up')
      expect(change.change).toContain('+')
      expect(change.change).toContain('%')
    })

    it('should calculate negative change correctly', () => {
      const change = calculateChange(50, 100)
      expect(change.trend).toBe('down')
      expect(change.change).toContain('-')
      expect(change.change).toContain('%')
    })

    it('should handle no change', () => {
      const change = calculateChange(100, 100)
      expect(change.trend).toBe('neutral')
      expect(change.change).toBe('No change')
    })

    it('should handle zero previous value with positive current', () => {
      const change = calculateChange(100, 0)
      expect(change.trend).toBe('up')
      expect(change.change).toBe('+100%')
    })

    it('should handle zero previous and current values', () => {
      const change = calculateChange(0, 0)
      expect(change.trend).toBe('neutral')
      expect(change.change).toBe('No change')
    })

    it('should round percentage to 1 decimal place', () => {
      const change = calculateChange(133.33, 100)
      expect(change.change).toMatch(/\+33\.3%/)
    })
  })

  describe('calculateMetricsWithComparison', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should calculate current and previous metrics', () => {
      const result = calculateMetricsWithComparison(mockEntries)
      
      expect(result.current).toBeDefined()
      expect(result.previous).toBeDefined()
      expect(result.changes).toBeDefined()
      
      expect(result.current.totalIncome).toBe(1000) // June income
      expect(result.current.totalExpenses).toBe(350) // June expenses
      expect(result.previous.totalIncome).toBe(500) // May income
      expect(result.previous.totalExpenses).toBe(100) // May expenses
    })

    it('should calculate changes for all metrics', () => {
      const result = calculateMetricsWithComparison(mockEntries)
      
      expect(result.changes.balance).toBeDefined()
      expect(result.changes.income).toBeDefined()
      expect(result.changes.expenses).toBeDefined()
      expect(result.changes.savings).toBeDefined()
      
      expect(result.changes.balance.trend).toBeDefined()
      expect(result.changes.income.trend).toBeDefined()
      expect(result.changes.expenses.trend).toBeDefined()
      expect(result.changes.savings.trend).toBeDefined()
    })

    it('should handle empty entries', () => {
      const result = calculateMetricsWithComparison([])
      
      expect(result.current.totalIncome).toBe(0)
      expect(result.current.totalExpenses).toBe(0)
      expect(result.previous.totalIncome).toBe(0)
      expect(result.previous.totalExpenses).toBe(0)
    })
  })
})

