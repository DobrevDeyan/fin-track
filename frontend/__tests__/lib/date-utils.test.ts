/**
 * Unit tests for date-utils.ts
 */

import {
  formatDate,
  formatDateCompact,
  formatDateForInput,
  getDateRange,
  getCustomDateRange,
  isDateInRange,
  getMonthName,
  getPreviousMonth,
} from '@/lib/date-utils'

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const dateStr = '2024-01-15T10:30:00Z'
      const result = formatDate(dateStr)
      expect(result).toBeTruthy()
      expect(result).toContain('2024')
    })

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date)
      expect(result).toBeTruthy()
    })

    it('should use default options', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date)
      expect(result).toBeTruthy()
    })

    it('should respect custom options', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' })
      expect(result).toContain('2024')
    })

    it('should use custom locale', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date, { locale: 'de-DE' })
      expect(result).toBeTruthy()
    })
  })

  describe('formatDateCompact', () => {
    it('should format date in compact format', () => {
      const date = new Date('2024-01-15')
      const result = formatDateCompact(date)
      expect(result).toContain('Jan')
      expect(result).toContain('15')
    })
  })

  describe('formatDateForInput', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15')
      const result = formatDateForInput(date)
      expect(result).toBe('2024-01-15')
    })

    it('should format date string as YYYY-MM-DD', () => {
      const dateStr = '2024-01-15T10:30:00Z'
      const result = formatDateForInput(dateStr)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getDateRange', () => {
    beforeEach(() => {
      // Mock current date for consistent testing
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return today range', () => {
      const range = getDateRange('today')
      expect(range).not.toBeNull()
      expect(range!.start).toBeInstanceOf(Date)
      expect(range!.end).toBeInstanceOf(Date)
      expect(range!.start.getDate()).toBe(15)
      expect(range!.end.getDate()).toBe(15)
    })

    it('should return this week range', () => {
      const range = getDateRange('thisWeek')
      expect(range).not.toBeNull()
      expect(range!.start).toBeInstanceOf(Date)
      expect(range!.end).toBeInstanceOf(Date)
    })

    it('should return this month range', () => {
      const range = getDateRange('thisMonth')
      expect(range).not.toBeNull()
      expect(range!.start.getMonth()).toBe(5) // June (0-indexed)
      expect(range!.end.getMonth()).toBe(5)
    })

    it('should return last month range', () => {
      const range = getDateRange('lastMonth')
      expect(range).not.toBeNull()
      expect(range!.start.getMonth()).toBe(4) // May (0-indexed)
      expect(range!.end.getMonth()).toBe(4)
    })

    it('should return this year range', () => {
      const range = getDateRange('thisYear')
      expect(range).not.toBeNull()
      expect(range!.start.getFullYear()).toBe(2024)
      expect(range!.end.getFullYear()).toBe(2024)
    })

    it('should return null for invalid filter', () => {
      const range = getDateRange('invalid' as any)
      expect(range).toBeNull()
    })

    it('should handle year boundary for last month', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      const range = getDateRange('lastMonth')
      expect(range).not.toBeNull()
      expect(range!.start.getFullYear()).toBe(2023)
      expect(range!.end.getFullYear()).toBe(2023)
    })
  })

  describe('getCustomDateRange', () => {
    it('should return custom date range', () => {
      const range = getCustomDateRange('2024-01-01', '2024-01-31')
      expect(range).not.toBeNull()
      expect(range!.start).toBeInstanceOf(Date)
      expect(range!.end).toBeInstanceOf(Date)
    })

    it('should return null for empty start date', () => {
      const range = getCustomDateRange('', '2024-01-31')
      expect(range).toBeNull()
    })

    it('should return null for empty end date', () => {
      const range = getCustomDateRange('2024-01-01', '')
      expect(range).toBeNull()
    })

    it('should set start date to beginning of day', () => {
      const range = getCustomDateRange('2024-01-15', '2024-01-15')
      expect(range!.start.getHours()).toBe(0)
      expect(range!.start.getMinutes()).toBe(0)
      expect(range!.start.getSeconds()).toBe(0)
    })

    it('should set end date to end of day', () => {
      const range = getCustomDateRange('2024-01-15', '2024-01-15')
      expect(range!.end.getHours()).toBe(23)
      expect(range!.end.getMinutes()).toBe(59)
      expect(range!.end.getSeconds()).toBe(59)
    })
  })

  describe('isDateInRange', () => {
    it('should return true if date is within range', () => {
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      }
      expect(isDateInRange('2024-01-15', range)).toBe(true)
    })

    it('should return false if date is before range', () => {
      const range = {
        start: new Date('2024-01-15'),
        end: new Date('2024-01-31'),
      }
      expect(isDateInRange('2024-01-01', range)).toBe(false)
    })

    it('should return false if date is after range', () => {
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-15'),
      }
      expect(isDateInRange('2024-01-31', range)).toBe(false)
    })

    it('should return true for date at range start', () => {
      const range = {
        start: new Date('2024-01-15'),
        end: new Date('2024-01-31'),
      }
      expect(isDateInRange('2024-01-15', range)).toBe(true)
    })

    it('should return true for date at range end', () => {
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-15'),
      }
      expect(isDateInRange('2024-01-15', range)).toBe(true)
    })

    it('should handle Date objects', () => {
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      }
      expect(isDateInRange(new Date('2024-01-15'), range)).toBe(true)
    })
  })

  describe('getMonthName', () => {
    it('should return month name for Date object', () => {
      const date = new Date('2024-01-15')
      const result = getMonthName(date)
      expect(result).toBe('January')
    })

    it('should return month name for date string', () => {
      const result = getMonthName('2024-01-15')
      expect(result).toBe('January')
    })

    it('should use custom locale', () => {
      const date = new Date('2024-01-15')
      const result = getMonthName(date, 'de-DE')
      expect(result).toBeTruthy()
    })
  })

  describe('getPreviousMonth', () => {
    it('should return previous month in same year', () => {
      const result = getPreviousMonth(6, 2024) // July
      expect(result.month).toBe(5) // June (0-indexed)
      expect(result.year).toBe(2024)
    })

    it('should handle January (year boundary)', () => {
      const result = getPreviousMonth(0, 2024) // January
      expect(result.month).toBe(11) // December (0-indexed)
      expect(result.year).toBe(2023)
    })

    it('should handle year boundary correctly', () => {
      const result = getPreviousMonth(0, 2024)
      expect(result.year).toBe(2023)
      expect(result.month).toBe(11)
    })
  })
})

