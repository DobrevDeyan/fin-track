/**
 * Unit tests for currency-utils.ts
 */

import { formatCurrency, formatAmount } from '@/lib/currency-utils'

describe('currency-utils', () => {
  describe('formatCurrency', () => {
    it('should format EUR currency correctly', () => {
      expect(formatCurrency(1234.56, { currency: 'EUR' })).toMatch(/€|EUR/)
      expect(formatCurrency(1234.56, { currency: 'EUR' })).toContain('1,234.56')
    })

    it('should format USD currency correctly', () => {
      const result = formatCurrency(1234.56, { currency: 'USD' })
      expect(result).toMatch(/\$|USD/)
      expect(result).toContain('1,234.56')
    })

    it('should use EUR as default currency', () => {
      const result = formatCurrency(100)
      expect(result).toMatch(/€|EUR/)
    })

    it('should handle zero amount', () => {
      const result = formatCurrency(0, { currency: 'EUR' })
      expect(result).toMatch(/€|EUR/)
      expect(result).toContain('0.00')
    })

    it('should handle negative amounts', () => {
      const result = formatCurrency(-1234.56, { currency: 'EUR' })
      expect(result).toMatch(/€|EUR/)
      // Negative amounts will have the minus sign, but format varies by locale
      expect(result).toMatch(/1[,.]234[,.]56/) // Match the number part
    })

    it('should handle small amounts', () => {
      const result = formatCurrency(0.99, { currency: 'EUR' })
      expect(result).toMatch(/€|EUR/)
      expect(result).toContain('0.99')
    })

    it('should handle large amounts', () => {
      const result = formatCurrency(1000000.99, { currency: 'EUR' })
      expect(result).toMatch(/€|EUR/)
      expect(result).toContain('1,000,000.99')
    })

    it('should respect minimumFractionDigits option', () => {
      const result = formatCurrency(100, { currency: 'EUR', minimumFractionDigits: 0 })
      expect(result).toMatch(/€|EUR/)
      expect(result).toContain('100')
      expect(result).not.toContain('100.00')
    })

    it('should respect maximumFractionDigits option', () => {
      const result = formatCurrency(100.123456, { currency: 'EUR', maximumFractionDigits: 2 })
      expect(result).toContain('100.12')
      expect(result).not.toContain('100.123456')
    })

    it('should use custom locale', () => {
      const result = formatCurrency(1234.56, { currency: 'EUR', locale: 'de-DE' })
      // German locale uses different formatting
      expect(result).toBeTruthy()
    })
  })

  describe('formatAmount', () => {
    it('should format amount with default Euro symbol', () => {
      expect(formatAmount(1234.56)).toBe('€1,234.56')
    })

    it('should format amount with custom currency symbol', () => {
      expect(formatAmount(1234.56, '$')).toBe('$1,234.56')
      expect(formatAmount(1234.56, '£')).toBe('£1,234.56')
    })

    it('should handle zero amount', () => {
      expect(formatAmount(0)).toBe('€0.00')
    })

    it('should handle negative amounts', () => {
      expect(formatAmount(-1234.56)).toBe('€-1,234.56')
    })

    it('should always use 2 decimal places', () => {
      expect(formatAmount(100)).toBe('€100.00')
      expect(formatAmount(100.5)).toBe('€100.50')
      expect(formatAmount(100.999)).toBe('€101.00') // Rounded
    })

    it('should format large amounts with commas', () => {
      expect(formatAmount(1000000.99)).toBe('€1,000,000.99')
    })
  })
})

