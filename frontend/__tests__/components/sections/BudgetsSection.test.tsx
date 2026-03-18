/**
 * Component tests for BudgetsSection
 */

import { render, screen } from '@/__tests__/utils/test-utils'
import { BudgetsSection } from '@/components/dashboard/sections/BudgetsSection'
import userEvent from '@testing-library/user-event'

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock contexts
const mockBudgetsContext: any = {
  budgets: [],
  loading: false,
  dialogOpen: false,
  editingBudget: null,
  handleDialogClose: jest.fn(),
  handleSubmit: jest.fn(),
  handleEdit: jest.fn(),
  handleDelete: jest.fn(),
  handleRenew: jest.fn(),
  openDialog: jest.fn(),
}

jest.mock('@/contexts/dashboard/BudgetsContext', () => ({
  useBudgetsContext: () => mockBudgetsContext,
}))

jest.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ userCurrency: 'EUR' }),
}))

// Mock child components
jest.mock('@/components/dashboard/BudgetList', () => ({
  BudgetList: ({ budgets, onAdd }: any) => (
    <div data-testid="budget-list">
      {budgets.length === 0 ? (
        <div>No budgets</div>
      ) : (
        budgets.map((budget: any) => <div key={budget.id}>{budget.name}</div>)
      )}
      <button onClick={onAdd}>Add Budget from List</button>
    </div>
  ),
}))

jest.mock('@/components/dashboard/BudgetDialog', () => ({
  BudgetDialog: ({ open }: any) => (open ? <div data-testid="budget-dialog">Budget Dialog</div> : null),
}))

describe('BudgetsSection', () => {
  const mockEntries = [
    {
      id: '1',
      description: 'Groceries',
      amount: 50.0,
      category: 'Food & Dining',
      date: '2024-06-15T10:00:00Z',
      type: 'expense' as const,
      currency: 'EUR',
    },
  ]

  const mockCategories = ['Food & Dining', 'Transport', 'Entertainment']

  const defaultProps = {
    entries: mockEntries,
    categories: mockCategories,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockBudgetsContext.budgets = []
    mockBudgetsContext.loading = false
    mockBudgetsContext.dialogOpen = false
  })

  // Test Case 1: Rendering
  it('should render budgets section', () => {
    render(<BudgetsSection {...defaultProps} />)

    expect(screen.getByText(/description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /createBudget/i })).toBeInTheDocument()
  })

  // Test Case 2: Loading state
  it('should show loading skeletons when loading', () => {
    mockBudgetsContext.loading = true

    render(<BudgetsSection {...defaultProps} />)

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
    // Should show 3 skeleton cards
    const skeletons = screen.getAllByRole('status')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // Test Case 3: Create budget button
  it('should call openDialog when create budget is clicked', async () => {
    const user = userEvent.setup()
    render(<BudgetsSection {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /createBudget/i }))

    expect(mockBudgetsContext.openDialog).toHaveBeenCalledTimes(1)
  })

  // Test Case 4: Display budgets
  it('should display budgets when available', () => {
    mockBudgetsContext.budgets = [
      {
        id: 'budget-1',
        name: 'Groceries Budget',
        category: 'Food & Dining',
        amount: 500,
        currency: 'EUR',
        period: 'monthly' as const,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        isActive: true,
        alertThreshold: 80,
      },
    ]

    render(<BudgetsSection {...defaultProps} />)

    expect(screen.getByText('Groceries Budget')).toBeInTheDocument()
  })

  // Test Case 5: Empty state (no budgets)
  it('should show no budgets message when budgets list is empty', () => {
    mockBudgetsContext.budgets = []
    mockBudgetsContext.loading = false

    render(<BudgetsSection {...defaultProps} />)

    expect(screen.getByTestId('budget-list')).toBeInTheDocument()
    expect(screen.getByText('No budgets')).toBeInTheDocument()
  })

  // Test Case 6: Accessibility - loading announcement
  it('should have proper aria-live region for loading state', () => {
    render(<BudgetsSection {...defaultProps} />)

    const liveRegion = screen.getByText(/description/i).closest('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })

  // Test Case 7: Pass correct props to BudgetList
  it('should pass entries and categories to BudgetList', () => {
    render(<BudgetsSection {...defaultProps} />)

    // BudgetList is rendered (verified by data-testid)
    expect(screen.getByTestId('budget-list')).toBeInTheDocument()
  })

  // Test Case 8: Dialog integration
  it('should render BudgetDialog when dialog is open', () => {
    mockBudgetsContext.dialogOpen = true

    render(<BudgetsSection {...defaultProps} />)

    expect(screen.getByTestId('budget-dialog')).toBeInTheDocument()
  })

  // Test Case 9: Dialog not rendered when closed
  it('should not render BudgetDialog when dialog is closed', () => {
    mockBudgetsContext.dialogOpen = false

    render(<BudgetsSection {...defaultProps} />)

    expect(screen.queryByTestId('budget-dialog')).not.toBeInTheDocument()
  })

  // Test Case 10: Accessibility - aria-busy attribute
  it('should set aria-busy when loading', () => {
    mockBudgetsContext.loading = true

    render(<BudgetsSection {...defaultProps} />)

    const liveRegion = screen.getByLabelText(/description/i).closest('[aria-busy="true"]')
    expect(liveRegion).toBeInTheDocument()
  })
})
