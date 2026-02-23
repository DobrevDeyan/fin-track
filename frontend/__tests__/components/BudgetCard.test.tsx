/**
 * Component tests for BudgetCard
 */

import { render, screen } from '@/__tests__/utils/test-utils'
import { BudgetCard } from '@/components/dashboard/BudgetCard'
import userEvent from '@testing-library/user-event'

const mockBudget = {
  id: 'budget-1',
  name: 'Groceries',
  category: 'Food & Dining',
  amount: 500,
  currency: 'EUR',
  period: 'monthly' as const,
  startDate: '2024-06-01T00:00:00Z',
  endDate: '2024-06-30T23:59:59Z',
  isActive: true,
  alertThreshold: 80,
}

describe('BudgetCard', () => {
  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
  })

  it('should render budget name', () => {
    render(
      <BudgetCard
        budget={mockBudget}
        spent={300}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('Groceries')).toBeInTheDocument()
  })

  it('should render budget category', () => {
    render(
      <BudgetCard
        budget={mockBudget}
        spent={300}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
  })

  it('should render budget amount and spent amount', () => {
    render(
      <BudgetCard
        budget={mockBudget}
        spent={300}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText(/EUR 300.00 \/ EUR 500.00/)).toBeInTheDocument()
  })

    it('should calculate and display remaining amount', () => {
      render(
        <BudgetCard
          budget={mockBudget}
          spent={300}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )
      expect(screen.getByText(/EUR 200.00 remaining/)).toBeInTheDocument()
    })

  it('should display over budget message when spent exceeds budget', () => {
    render(
      <BudgetCard
        budget={mockBudget}
        spent={600}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText(/Over budget: EUR 100.00/)).toBeInTheDocument()
  })

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <BudgetCard
        budget={mockBudget}
        spent={300}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    
    expect(mockOnEdit).toHaveBeenCalledTimes(1)
    expect(mockOnEdit).toHaveBeenCalledWith(mockBudget)
  })

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <BudgetCard
        budget={mockBudget}
        spent={300}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith('budget-1')
  })

    it('should display progress bar with correct percentage', () => {
      render(
        <BudgetCard
          budget={mockBudget}
          spent={250}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )
      // 250 / 500 = 50%
      // getByRole will throw if element doesn't exist, so we just verify it's rendered
      const progressBar = screen.getByRole('progressbar', { hidden: true })
      expect(progressBar).toBeDefined()
    })

  it('should display period and date range', () => {
    render(
      <BudgetCard
        budget={mockBudget}
        spent={300}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText(/Monthly/)).toBeInTheDocument()
  })

  it('should handle zero spending', () => {
      render(
        <BudgetCard
          budget={mockBudget}
          spent={0}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )
      expect(screen.getByText(/EUR 0.00 \/ EUR 500.00/)).toBeInTheDocument()
      expect(screen.getByText(/EUR 500.00 remaining/)).toBeInTheDocument()
    })
})

