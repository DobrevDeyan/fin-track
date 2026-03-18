/**
 * Component tests for TransactionsTable
 */

import { render, screen, waitFor } from '@/__tests__/utils/test-utils'
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import userEvent from '@testing-library/user-event'

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

describe('TransactionsTable', () => {
  const mockOnAdd = jest.fn()
  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnLoadMore = jest.fn()

  const mockTransactions = [
    {
      id: '1',
      description: 'Groceries',
      amount: 50.0,
      category: 'Food & Dining',
      date: '2024-06-15T10:00:00Z',
      type: 'expense' as const,
      currency: 'EUR',
    },
    {
      id: '2',
      description: 'Salary',
      amount: 3000.0,
      category: 'Income',
      date: '2024-06-01T10:00:00Z',
      type: 'income' as const,
      currency: 'EUR',
      notes: 'Monthly salary',
      tags: ['work', 'monthly'],
    },
  ]

  const defaultProps = {
    transactions: mockTransactions,
    onAdd: mockOnAdd,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
  }

  beforeEach(() => {
    mockOnAdd.mockClear()
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
    mockOnLoadMore.mockClear()
  })

  // Test Case 1: Rendering with transactions
  it('should render transactions table with data', () => {
    render(<TransactionsTable {...defaultProps} />)

    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
  })

  // Test Case 2: Empty state
  it('should show empty state when no transactions', () => {
    render(<TransactionsTable {...defaultProps} transactions={[]} />)

    expect(screen.getByText(/no entries yet/i)).toBeInTheDocument()
  })

  // Test Case 3: Add button
  it('should call onAdd when add button is clicked', async () => {
    const user = userEvent.setup()
    render(<TransactionsTable {...defaultProps} />)

    const addButton = screen.getByRole('button', { name: /addEntry/i })
    await user.click(addButton)

    expect(mockOnAdd).toHaveBeenCalledTimes(1)
  })

  // Test Case 4: Edit button
  it('should call onEdit with transaction id when edit is clicked', async () => {
    const user = userEvent.setup()
    render(<TransactionsTable {...defaultProps} />)

    // Find edit buttons (there should be 2 for 2 transactions shown initially)
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    expect(mockOnEdit).toHaveBeenCalledTimes(1)
    expect(mockOnEdit).toHaveBeenCalledWith('1')
  })

  // Test Case 5: Delete confirmation dialog
  it('should show delete confirmation dialog when delete is clicked', async () => {
    const user = userEvent.setup()
    render(<TransactionsTable {...defaultProps} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/deleteEntry/i)).toBeInTheDocument()
    })
  })

  // Test Case 6: Confirm delete
  it('should call onDelete when delete is confirmed', async () => {
    const user = userEvent.setup()
    render(<TransactionsTable {...defaultProps} />)

    // Open delete confirmation
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    // Wait for dialog and confirm
    await waitFor(() => {
      expect(screen.getByText(/deleteEntry/i)).toBeInTheDocument()
    })

    // Find and click the confirm button in the dialog
    const confirmButton = screen.getByRole('button', { name: /^delete$/i })
    await user.click(confirmButton)

    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  // Test Case 7: Cancel delete
  it('should close dialog when delete is cancelled', async () => {
    const user = userEvent.setup()
    render(<TransactionsTable {...defaultProps} />)

    // Open delete confirmation
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/deleteEntry/i)).toBeInTheDocument()
    })

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText(/deleteEntry/i)).not.toBeInTheDocument()
    })
    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  // Test Case 8: Display notes
  it('should display notes when present', () => {
    render(<TransactionsTable {...defaultProps} />)

    expect(screen.getByText('Monthly salary')).toBeInTheDocument()
  })

  // Test Case 9: Display tags
  it('should display tags when present', () => {
    render(<TransactionsTable {...defaultProps} />)

    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('monthly')).toBeInTheDocument()
  })

  // Test Case 10: Pagination - initial state (show only 2)
  it('should show only 2 transactions initially', () => {
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `${i}`,
      description: `Transaction ${i}`,
      amount: 10 * i,
      category: 'Test',
      date: '2024-06-01T10:00:00Z',
      type: 'expense' as const,
      currency: 'EUR',
    }))

    render(<TransactionsTable {...defaultProps} transactions={manyTransactions} />)

    expect(screen.getByText('Transaction 0')).toBeInTheDocument()
    expect(screen.getByText('Transaction 1')).toBeInTheDocument()
    expect(screen.queryByText('Transaction 2')).not.toBeInTheDocument()
  })

  // Test Case 11: Expand to show more
  it('should expand to show more transactions when show more is clicked', async () => {
    const user = userEvent.setup()
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `${i}`,
      description: `Transaction ${i}`,
      amount: 10 * i,
      category: 'Test',
      date: '2024-06-01T10:00:00Z',
      type: 'expense' as const,
      currency: 'EUR',
    }))

    render(<TransactionsTable {...defaultProps} transactions={manyTransactions} />)

    // Click expand button
    const expandButton = screen.getByRole('button', { name: /showMore/i })
    await user.click(expandButton)

    // Should now show 20 transactions
    await waitFor(() => {
      expect(screen.getByText('Transaction 19')).toBeInTheDocument()
    })
  })

  // Test Case 12: Pagination controls with many items
  it('should show pagination controls when expanded with many transactions', async () => {
    const user = userEvent.setup()
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `${i}`,
      description: `Transaction ${i}`,
      amount: 10 * i,
      category: 'Test',
      date: '2024-06-01T10:00:00Z',
      type: 'expense' as const,
      currency: 'EUR',
    }))

    render(<TransactionsTable {...defaultProps} transactions={manyTransactions} />)

    // Expand first
    await user.click(screen.getByRole('button', { name: /showMore/i }))

    await waitFor(() => {
      // Should show pagination buttons
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })
  })

  // Test Case 13: Load more functionality
  it('should call onLoadMore when load more button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <TransactionsTable
        {...defaultProps}
        onLoadMore={mockOnLoadMore}
        hasMore={true}
        isLoadingMore={false}
      />
    )

    // Expand first
    await user.click(screen.getByRole('button', { name: /showMore/i }))

    // Click load more
    const loadMoreButton = screen.getByRole('button', { name: /loadMore/i })
    await user.click(loadMoreButton)

    expect(mockOnLoadMore).toHaveBeenCalledTimes(1)
  })

  // Test Case 14: Receipt icon
  it('should show receipt icon when receipt URL is present', () => {
    const transactionWithReceipt = [
      {
        ...mockTransactions[0],
        receiptUrl: 'https://example.com/receipt.jpg',
      },
    ]

    render(<TransactionsTable {...defaultProps} transactions={transactionWithReceipt} />)

    // Receipt icon should be present
    const receiptButton = screen.getByRole('button', { name: /viewReceipt/i })
    expect(receiptButton).toBeInTheDocument()
  })

  // Test Case 15: Opens receipt dialog
  it('should open receipt dialog when receipt icon is clicked', async () => {
    const user = userEvent.setup()
    const transactionWithReceipt = [
      {
        ...mockTransactions[0],
        receiptUrl: 'https://example.com/receipt.jpg',
      },
    ]

    render(<TransactionsTable {...defaultProps} transactions={transactionWithReceipt} />)

    const receiptButton = screen.getByRole('button', { name: /viewReceipt/i })
    await user.click(receiptButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
