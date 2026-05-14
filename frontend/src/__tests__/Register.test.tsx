import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Register } from '../pages/Register'

const mockRegister = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, login: vi.fn(), register: mockRegister, logout: vi.fn() }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('min 8 characters')).toBeInTheDocument()
  })

  it('renders link to login page', () => {
    renderRegister()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('shows toast error when password is shorter than 8 chars', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByPlaceholderText('you@example.com'), 'u@test.com')
    await user.type(screen.getByPlaceholderText('min 8 characters'), 'short')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Password must be at least 8 characters'),
    )
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('calls register with email and password on valid submit', async () => {
    const user = userEvent.setup()
    mockRegister.mockResolvedValue(undefined)
    renderRegister()

    await user.type(screen.getByPlaceholderText('you@example.com'), 'new@test.com')
    await user.type(screen.getByPlaceholderText('min 8 characters'), 'securepass')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('new@test.com', 'securepass'))
  })

  it('navigates to / on successful register', async () => {
    const user = userEvent.setup()
    mockRegister.mockResolvedValue(undefined)
    renderRegister()

    await user.type(screen.getByPlaceholderText('you@example.com'), 'new@test.com')
    await user.type(screen.getByPlaceholderText('min 8 characters'), 'securepass')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('shows error toast when registration fails', async () => {
    const user = userEvent.setup()
    mockRegister.mockRejectedValue({ response: { data: { message: 'Email already in use' } } })
    renderRegister()

    await user.type(screen.getByPlaceholderText('you@example.com'), 'dupe@test.com')
    await user.type(screen.getByPlaceholderText('min 8 characters'), 'securepass')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email already in use'))
  })

  it('falls back to generic error message when response has no message', async () => {
    const user = userEvent.setup()
    mockRegister.mockRejectedValue(new Error('Network error'))
    renderRegister()

    await user.type(screen.getByPlaceholderText('you@example.com'), 'x@test.com')
    await user.type(screen.getByPlaceholderText('min 8 characters'), 'securepass')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Registration failed'))
  })
})
