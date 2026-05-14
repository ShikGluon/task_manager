import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Task } from '../hooks/useTasks'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Import after mock is declared so we get the mocked version
const { useTasks } = await import('../hooks/useTasks')
const client = (await import('../api/client')).default

const makeTask = (overrides?: Partial<Task>): Task => ({
  id: '1',
  title: 'Test task',
  status: 'Pending',
  priority: 'Medium',
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('useTasks hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with loading=true then resolves tasks', async () => {
    const tasks = [makeTask()]
    vi.mocked(client.get).mockResolvedValue({ data: tasks })

    const { result } = renderHook(() => useTasks())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual(tasks)
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails', async () => {
    vi.mocked(client.get).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to load tasks')
    expect(result.current.tasks).toHaveLength(0)
  })

  it('passes status filter in query params', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: [] })

    renderHook(() => useTasks('Pending'))
    await waitFor(() => expect(client.get).toHaveBeenCalled())

    expect(vi.mocked(client.get).mock.calls[0][0]).toContain('status=Pending')
  })

  it('omits status param when filter is All', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: [] })

    renderHook(() => useTasks('All'))
    await waitFor(() => expect(client.get).toHaveBeenCalled())

    expect(vi.mocked(client.get).mock.calls[0][0]).not.toContain('status=')
  })

  it('passes sort param when provided', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: [] })

    renderHook(() => useTasks(undefined, 'dueDate'))
    await waitFor(() => expect(client.get).toHaveBeenCalled())

    expect(vi.mocked(client.get).mock.calls[0][0]).toContain('sort=dueDate')
  })

  it('createTask POSTs and prepends the new task', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: [] })
    const created = makeTask({ id: '99', title: 'Created' })
    vi.mocked(client.post).mockResolvedValue({ data: created })

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createTask({ title: 'Created', priority: 'Medium' })
    })

    expect(result.current.tasks[0]).toEqual(created)
  })

  it('toggleTask optimistically flips status then syncs server response', async () => {
    const task = makeTask({ status: 'Pending' })
    vi.mocked(client.get).mockResolvedValue({ data: [task] })
    const serverTask = { ...task, status: 'Completed' }
    vi.mocked(client.put).mockResolvedValue({ data: serverTask })

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleTask(task)
    })

    expect(result.current.tasks[0].status).toBe('Completed')
  })

  it('toggleTask rolls back on API error', async () => {
    const task = makeTask({ status: 'Pending' })
    vi.mocked(client.get).mockResolvedValue({ data: [task] })
    vi.mocked(client.put).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.toggleTask(task)).rejects.toThrow()
    })

    expect(result.current.tasks[0].status).toBe('Pending')
  })

  it('deleteTask optimistically removes the task', async () => {
    const task = makeTask()
    vi.mocked(client.get).mockResolvedValue({ data: [task] })
    vi.mocked(client.delete).mockResolvedValue({})

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteTask(task.id)
    })

    expect(result.current.tasks).toHaveLength(0)
  })

  it('deleteTask re-fetches and throws on API error', async () => {
    const task = makeTask()
    vi.mocked(client.get)
      .mockResolvedValueOnce({ data: [task] })
      .mockResolvedValueOnce({ data: [task] }) // re-fetch restores
    vi.mocked(client.delete).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.deleteTask(task.id)).rejects.toThrow()
    })

    await waitFor(() => expect(result.current.tasks).toHaveLength(1))
  })
})
