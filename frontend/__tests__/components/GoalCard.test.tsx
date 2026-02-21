/**
 * Component tests for GoalCard
 */

import { render, screen } from '@/__tests__/utils/test-utils'
import { GoalCard } from '@/components/dashboard/GoalCard'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'

const mockGoal = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Emergency Fund',
  targetAmount: 10000,
  currentAmount: 3000,
  currency: 'EUR',
  deadline: Timestamp.fromDate(new Date('2024-12-31')),
  category: 'Savings',
  description: 'Build emergency fund',
  isActive: true,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}

describe('GoalCard', () => {
  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnAddFunds = jest.fn()

  beforeEach(() => {
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
    mockOnAddFunds.mockClear()
  })

  it('should render goal name', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
  })

  it('should render current and target amounts', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText(/€3,000/)).toBeInTheDocument()
    expect(screen.getByText(/€10,000/)).toBeInTheDocument()
  })

  it('should calculate and display progress percentage', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    // 3000 / 10000 = 30%
    expect(screen.getByText(/30%/)).toBeInTheDocument()
  })

  it('should display description if provided', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText('Build emergency fund')).toBeInTheDocument()
  })

  it('should display category if provided', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText('Savings')).toBeInTheDocument()
  })

  it('should display deadline if provided', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    
    expect(mockOnEdit).toHaveBeenCalledTimes(1)
    expect(mockOnEdit).toHaveBeenCalledWith(mockGoal)
  })

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith('goal-1')
  })

  it('should handle goal without deadline', () => {
    const goalWithoutDeadline = { ...mockGoal, deadline: undefined }
    render(
      <GoalCard
        goal={goalWithoutDeadline}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
  })

  it('should handle goal without description', () => {
    const goalWithoutDescription = { ...mockGoal, description: undefined }
    render(
      <GoalCard
        goal={goalWithoutDescription}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
  })

  it('should display 100% when current equals target', () => {
    const completedGoal = { ...mockGoal, currentAmount: 10000 }
    render(
      <GoalCard
        goal={completedGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('should handle zero progress', () => {
    const newGoal = { ...mockGoal, currentAmount: 0 }
    render(
      <GoalCard
        goal={newGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('should cap progress at 100% when current exceeds target', () => {
    const overGoal = { ...mockGoal, currentAmount: 15000 }
    render(
      <GoalCard
        goal={overGoal}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAddFunds={mockOnAddFunds}
      />
    )
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })
})

