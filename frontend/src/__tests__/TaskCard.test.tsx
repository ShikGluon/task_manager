import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskCard } from '../components/TaskCard'
import type { Task } from '../hooks/useTasks'

const baseTask: Task = {
  id: 'abc',
  title: 'Write tests',
  status: 'Pending',
  priority: 'Medium',
  createdAt: new Date().toISOString(),
}

describe('TaskCard', () => {
  it('renders the task title', () => {
    render(<TaskCard task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Write tests')).toBeInTheDocument()
  })

  it('renders the priority badge', () => {
    render(<TaskCard task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    const task = { ...baseTask, description: 'Vitest and RTL' }
    render(<TaskCard task={task} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Vitest and RTL')).toBeInTheDocument()
  })

  it('renders due date when provided', () => {
    const task = { ...baseTask, dueDate: '2025-06-15T12:00:00Z' }
    render(<TaskCard task={task} onToggle={vi.fn()} onDelete={vi.fn()} />)
    // match "6/15/2025" (en-US) or "15/6/2025" (en-GB) – locale-independent
    expect(screen.getByText(/Due/)).toBeInTheDocument()
    expect(screen.getByText(/15.*2025|2025.*15/)).toBeInTheDocument()
  })

  it('shows line-through title for completed tasks', () => {
    const task = { ...baseTask, status: 'Completed' as const }
    render(<TaskCard task={task} onToggle={vi.fn()} onDelete={vi.fn()} />)
    const title = screen.getByText('Write tests')
    expect(title.className).toContain('line-through')
  })

  it('checkbox is checked for completed tasks', () => {
    const task = { ...baseTask, status: 'Completed' as const }
    render(<TaskCard task={task} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('checkbox is unchecked for pending tasks', () => {
    render(<TaskCard task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('calls onToggle with the task when checkbox clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<TaskCard task={baseTask} onToggle={onToggle} onDelete={vi.fn()} />)
    await user.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith(baseTask)
  })

  it('calls onDelete with the task id when delete clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<TaskCard task={baseTask} onToggle={vi.fn()} onDelete={onDelete} />)
    await user.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('abc')
  })

  it('applies red border for overdue pending tasks', () => {
    const task = { ...baseTask, dueDate: '2000-01-01T00:00:00Z' }
    const { container } = render(<TaskCard task={task} onToggle={vi.fn()} onDelete={vi.fn()} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-red-500')
  })

  it('does not apply overdue styling to completed tasks', () => {
    const task = { ...baseTask, status: 'Completed' as const, dueDate: '2000-01-01T00:00:00Z' }
    const { container } = render(<TaskCard task={task} onToggle={vi.fn()} onDelete={vi.fn()} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).not.toContain('border-red-500')
  })
})
