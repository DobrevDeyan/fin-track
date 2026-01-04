/**
 * Unit tests for validation.ts
 */

import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateAmount,
  validateRequired,
  PasswordValidationOptions,
} from '@/lib/validation'

describe('validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toEqual({ isValid: true })
      expect(validateEmail('user.name@example.co.uk')).toEqual({ isValid: true })
      expect(validateEmail('test+tag@example.com')).toEqual({ isValid: true })
    })

    it('should reject invalid email addresses', () => {
      const result = validateEmail('invalid-email')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject emails without @ symbol', () => {
      const result = validateEmail('invalidemail.com')
      expect(result.isValid).toBe(false)
    })

    it('should reject emails without domain', () => {
      const result = validateEmail('test@')
      expect(result.isValid).toBe(false)
    })

    it('should require email field', () => {
      const result = validateEmail('')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('validatePassword', () => {
    it('should validate password with default options', () => {
      expect(validatePassword('password123')).toEqual({ isValid: true })
    })

    it('should require minimum length', () => {
      const result = validatePassword('short', { minLength: 6 })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('6 characters')
    })

    it('should validate password meeting minimum length', () => {
      expect(validatePassword('password', { minLength: 6 })).toEqual({ isValid: true })
    })

    it('should require uppercase letter when specified', () => {
      const result = validatePassword('password123', { requireUppercase: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('uppercase')
    })

    it('should validate password with uppercase', () => {
      expect(validatePassword('Password123', { requireUppercase: true })).toEqual({ isValid: true })
    })

    it('should require lowercase letter when specified', () => {
      const result = validatePassword('PASSWORD123', { requireLowercase: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('lowercase')
    })

    it('should validate password with lowercase', () => {
      expect(validatePassword('Password123', { requireLowercase: true })).toEqual({ isValid: true })
    })

    it('should require number when specified', () => {
      const result = validatePassword('Password', { requireNumbers: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('number')
    })

    it('should validate password with number', () => {
      expect(validatePassword('Password123', { requireNumbers: true })).toEqual({ isValid: true })
    })

    it('should require special character when specified', () => {
      const result = validatePassword('Password123', { requireSpecialChars: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('special character')
    })

    it('should validate password with special character', () => {
      expect(validatePassword('Password123!', { requireSpecialChars: true })).toEqual({ isValid: true })
    })

    it('should require password field', () => {
      const result = validatePassword('')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should validate complex password with all requirements', () => {
      const options: PasswordValidationOptions = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      }
      expect(validatePassword('Password123!', options)).toEqual({ isValid: true })
    })
  })

  describe('validateConfirmPassword', () => {
    it('should validate matching passwords', () => {
      expect(validateConfirmPassword('password123', 'password123')).toEqual({ isValid: true })
    })

    it('should reject non-matching passwords', () => {
      const result = validateConfirmPassword('password123', 'different')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('match')
    })

    it('should require confirm password field', () => {
      const result = validateConfirmPassword('', 'password123')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('confirm')
    })

    it('should be case-sensitive', () => {
      const result = validateConfirmPassword('Password123', 'password123')
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateAmount', () => {
    it('should validate positive numbers', () => {
      expect(validateAmount(100)).toEqual({ isValid: true })
      expect(validateAmount(100.50)).toEqual({ isValid: true })
      expect(validateAmount(0.01)).toEqual({ isValid: true })
    })

    it('should validate string numbers', () => {
      expect(validateAmount('100')).toEqual({ isValid: true })
      expect(validateAmount('100.50')).toEqual({ isValid: true })
    })

    it('should reject zero', () => {
      const result = validateAmount(0)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('greater than 0')
    })

    it('should reject negative numbers', () => {
      const result = validateAmount(-100)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('greater than 0')
    })

    it('should reject invalid strings', () => {
      const result = validateAmount('invalid')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('valid amount')
    })

    it('should reject empty string', () => {
      const result = validateAmount('')
      expect(result.isValid).toBe(false)
    })

    it('should reject NaN', () => {
      const result = validateAmount(NaN)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateRequired', () => {
    it('should validate non-empty strings', () => {
      expect(validateRequired('value')).toEqual({ isValid: true })
      expect(validateRequired('test value')).toEqual({ isValid: true })
    })

    it('should reject empty strings', () => {
      const result = validateRequired('')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject whitespace-only strings', () => {
      const result = validateRequired('   ')
      expect(result.isValid).toBe(false)
    })

    it('should use default field name in error', () => {
      const result = validateRequired('')
      expect(result.error).toContain('Field')
    })

    it('should use custom field name in error', () => {
      const result = validateRequired('', 'Email')
      expect(result.error).toContain('Email')
    })

    it('should validate strings with content after trim', () => {
      expect(validateRequired('  value  ')).toEqual({ isValid: true })
    })
  })
})

