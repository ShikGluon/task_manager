import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

const client = (await import('../api/client')).default

function TestConsumer() {
  const { user, login, register, logout } = useAuth()
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <button onClick={() => login('a@b.com', 'pass1234')}>login</button>
      <button onClick={() => register('a@b.com', 'pass1234')}>register</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('initial user is null when no token in localStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('email').textContent).toBe('none')
  })

  it('restores user from localStorage on mount', () => {
    localStorage.setItem('user', JSON.stringify({ email: 'stored@test.com' }))
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('email').textContent).toBe('stored@test.com')
  })

  it('login() stores token and sets user', async () => {
    vi.mocked(client.post).mockResolvedValue({ data: { token: 'tok123', email: 'a@b.com' } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await act(async () => {
      screen.getByText('login').click()
    })

    expect(screen.getByTestId('email').textContent).toBe('a@b.com')
    expect(localStorage.getItem('token')).toBe('tok123')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ email: 'a@b.com' })
  })

  it('register() stores token and sets user', async () => {
    vi.mocked(client.post).mockResolvedValue({ data: { token: 'reg456', email: 'a@b.com' } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await act(async () => {
      screen.getByText('register').click()
    })

    expect(screen.getByTestId('email').textContent).toBe('a@b.com')
    expect(localStorage.getItem('token')).toBe('reg456')
  })

  it('logout() clears user and localStorage', async () => {
    vi.mocked(client.post).mockResolvedValue({ data: { token: 'tok', email: 'a@b.com' } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await act(async () => {
      screen.getByText('login').click()
    })
    await act(async () => {
      screen.getByText('logout').click()
    })

    expect(screen.getByTestId('email').textContent).toBe('none')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
