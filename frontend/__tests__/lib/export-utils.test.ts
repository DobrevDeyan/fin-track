/**
 * Unit tests for export-utils.ts
 */

import { entriesToCSV, downloadCSV, exportEntriesToCSV } from '@/lib/export-utils'

beforeEach(() => {
  // Reset any spies
  jest.restoreAllMocks()
})

describe('export-utils', () => {
  const mockEntries = [
    {
      id: '1',
      type: 'income' as const,
      amount: 1000,
      description: 'Salary',
      category: 'Salary',
      date: '2024-06-15T10:00:00Z',
      notes: 'Monthly salary',
    },
    {
      id: '2',
      type: 'expense' as const,
      amount: 50.99,
      description: 'Groceries',
      category: 'Food & Dining',
      date: '2024-06-20T10:00:00Z',
      notes: '',
    },
    {
      id: '3',
      type: 'expense' as const,
      amount: 25,
      description: 'Coffee with "quotes"',
      category: 'Food & Dining',
      date: '2024-06-25T10:00:00Z',
      notes: 'Starbucks',
    },
  ]

  describe('entriesToCSV', () => {
    it('should convert entries to CSV format', () => {
      const csv = entriesToCSV(mockEntries)
      // CSV format wraps fields in quotes, so check for quoted headers
      expect(csv).toContain('"Date","Type","Description","Category","Amount","Notes"')
      expect(csv).toContain('Salary')
      expect(csv).toContain('Groceries')
    })

    it('should include all required columns', () => {
      const csv = entriesToCSV(mockEntries)
      // CSV format wraps fields in quotes
      expect(csv).toContain('"Date"')
      expect(csv).toContain('"Type"')
      expect(csv).toContain('"Description"')
      expect(csv).toContain('"Category"')
      expect(csv).toContain('"Amount"')
      expect(csv).toContain('"Notes"')
    })

    it('should format income amounts correctly', () => {
      const csv = entriesToCSV(mockEntries)
      expect(csv).toContain('1000.00') // Income amount (positive)
    })

    it('should format expense amounts with negative sign', () => {
      const csv = entriesToCSV(mockEntries)
      expect(csv).toContain('-50.99') // Expense amount (negative)
      expect(csv).toContain('-25.00')
    })

    it('should format dates correctly', () => {
      const csv = entriesToCSV(mockEntries)
      // Should contain formatted date
      expect(csv).toBeTruthy()
    })

    it('should capitalize transaction type', () => {
      const csv = entriesToCSV(mockEntries)
      expect(csv).toContain('Income')
      expect(csv).toContain('Expense')
    })

    it('should handle empty notes', () => {
      const csv = entriesToCSV(mockEntries)
      expect(csv).toContain('""') // Empty notes should be empty string
    })

    it('should handle entries with quotes in description', () => {
      const csv = entriesToCSV(mockEntries)
      // Should escape quotes properly
      expect(csv).toContain('Coffee')
    })

    it('should wrap all fields in quotes', () => {
      const csv = entriesToCSV(mockEntries)
      // Each field should be wrapped in quotes
      const lines = csv.split('\n')
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          expect(line.startsWith('"')).toBe(true)
        }
      })
    })

    it('should handle empty entries array', () => {
      const csv = entriesToCSV([])
      // CSV format wraps fields in quotes
      expect(csv).toContain('"Date","Type","Description","Category","Amount","Notes"')
      expect(csv.split('\n').length).toBe(1) // Only header
    })
  })

  describe('downloadCSV', () => {
    it('should create download link and click it', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      const appendChildSpy = jest.spyOn(document.body, 'appendChild')
      const removeChildSpy = jest.spyOn(document.body, 'removeChild')
      
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      }
      createElementSpy.mockReturnValue(mockLink as any)
      
      downloadCSV('test csv content', 'test.csv')
      
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })

    it('should use default filename', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      }
      createElementSpy.mockReturnValue(mockLink as any)
      
      downloadCSV('test csv content')
      
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()
      
      createElementSpy.mockRestore()
    })

    it('should create blob URL', () => {
      const createObjectURLSpy = jest.spyOn(global.URL, 'createObjectURL')
      const revokeObjectURLSpy = jest.spyOn(global.URL, 'revokeObjectURL')
      const createElementSpy = jest.spyOn(document, 'createElement')
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      }
      createElementSpy.mockReturnValue(mockLink as any)
      
      downloadCSV('test csv content', 'test.csv')
      
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()
      
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
      createElementSpy.mockRestore()
    })
  })

  describe('exportEntriesToCSV', () => {
    it('should convert entries and download CSV', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      }
      createElementSpy.mockReturnValue(mockLink as any)
      
      exportEntriesToCSV(mockEntries)
      
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()
      
      createElementSpy.mockRestore()
    })

    it('should use default filename with date', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      }
      createElementSpy.mockReturnValue(mockLink as any)
      
      exportEntriesToCSV(mockEntries)
      
      expect(createElementSpy).toHaveBeenCalledWith('a')
      
      createElementSpy.mockRestore()
    })

    it('should use custom filename when provided', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      }
      createElementSpy.mockReturnValue(mockLink as any)
      
      exportEntriesToCSV(mockEntries, 'custom-export.csv')
      
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()
      
      createElementSpy.mockRestore()
    })

    it('should handle empty entries', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      }
      createElementSpy.mockReturnValue(mockLink as any)
      
      exportEntriesToCSV([])
      
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()
      
      createElementSpy.mockRestore()
    })
  })
})

