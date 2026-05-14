import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Dashboard } from '../pages/Dashboard'
import type { Task } from '../hooks/useTasks'

const mockCreateTask = vi.fn()
const mockToggleTask = vi.fn()
const mockDeleteTask = vi.fn()
const mockNavigate = vi.fn()
const mockLogout = vi.fn()

vi.mock('../hooks/useTasks')
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'user@test.com' },
    login: vi.fn(),
    register: vi.fn(),
    logout: mockLogout,
  }),
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))

const { useTasks } = await import('../hooks/useTasks')
const mockUseTasks = vi.mocked(useTasks)

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'First task',
    status: 'Pending',
    priority: 'High',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Second task',
    status: 'Completed',
    priority: 'Low',
    createdAt: new Date().toISOString(),
  },
]

function defaultHookReturn(overrides?: object) {
  return {
    tasks: sampleTasks,
    loading: false,
    error: null,
    createTask: mockCreateTask,
    toggleTask: mockToggleTask,
    deleteTask: mockDeleteTask,
    refresh: vi.fn(),
    ...overrides,
  }
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTasks.mockReturnValue(defaultHookReturn())
  })

  it('renders task titles', () => {
    renderDashboard()
    expect(screen.getByText('First task')).toBeInTheDocument()
    expect(screen.getByText('Second task')).toBeInTheDocument()
  })

  it('shows skeleton cards while loading', () => {
    mockUseTasks.mockReturnValue(defaultHookReturn({ tasks: [], loading: true }))
    const { container } = renderDashboard()
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when there are no tasks', () => {
    mockUseTasks.mockReturnValue(defaultHookReturn({ tasks: [] }))
    renderDashboard()
    expect(screen.getByText(/no tasks here/i)).toBeInTheDocument()
  })

  it('renders the filter buttons', () => {
    renderDashboard()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument()
  })

  it('clicking Pending filter re-renders hook with Pending status', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Pending' }))
    expect(mockUseTasks).toHaveBeenLastCalledWith('Pending', expect.anything())
  })

  it('clicking sort toggle passes dueDate to hook', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('button', { name: /sort by due date/i }))
    expect(mockUseTasks).toHaveBeenLastCalledWith(expect.anything(), 'dueDate')
  })

  it('shows the new task form when "+ New task" is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('button', { name: /new task/i }))
    expect(screen.getByPlaceholderText('Task title *')).toBeInTheDocument()
  })

  it('hides form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('button', { name: /new task/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByPlaceholderText('Task title *')).not.toBeInTheDocument()
  })

  it('creates a task and shows success toast', async () => {
    const user = userEvent.setup()
    mockCreateTask.mockResolvedValue({ id: '3', title: 'New one' })
    renderDashboard()

    await user.click(screen.getByRole('button', { name: /new task/i }))
    await user.type(screen.getByPlaceholderText('Task title *'), 'New one')
    await user.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'New one' })),
    )
    expect(toast.success).toHaveBeenCalledWith('Task created')
  })

  it('shows error toast when create fails', async () => {
    const user = userEvent.setup()
    mockCreateTask.mockRejectedValue(new Error('Server error'))
    renderDashboard()

    await user.click(screen.getByRole('button', { name: /new task/i }))
    await user.type(screen.getByPlaceholderText('Task title *'), 'Failing task')
    await user.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create task'))
  })

  it('calls toggleTask when a checkbox is clicked', async () => {
    const user = userEvent.setup()
    mockToggleTask.mockResolvedValue(undefined)
    renderDashboard()

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    await waitFor(() => expect(mockToggleTask).toHaveBeenCalledWith(sampleTasks[0]))
  })

  it('shows error toast when toggle fails', async () => {
    const user = userEvent.setup()
    mockToggleTask.mockRejectedValue(new Error('Toggle error'))
    renderDashboard()

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to update task'))
  })

  it('calls deleteTask and shows success toast when delete clicked', async () => {
    const user = userEvent.setup()
    mockDeleteTask.mockResolvedValue(undefined)
    renderDashboard()

    const deleteButtons = screen.getAllByText('Delete')
    await user.click(deleteButtons[0])

    await waitFor(() => expect(mockDeleteTask).toHaveBeenCalledWith('1'))
    expect(toast.success).toHaveBeenCalledWith('Task deleted')
  })

  it('shows user email in header', () => {
    renderDashboard()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('logout calls logout and navigates to /login', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByText('Sign out'))
    expect(mockLogout).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
