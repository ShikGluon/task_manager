import { useReducer, useEffect, useCallback } from 'react'
import client from '../api/client'

/** A task record as returned by the API. */
export interface Task {
  id: string
  title: string
  description?: string
  status: 'Pending' | 'Completed'
  priority: 'Low' | 'Medium' | 'High'
  /** ISO 8601 date string; absent if no due date was set. */
  dueDate?: string
  createdAt: string
}

/** Shape of the `useReducer` state managed by `useTasks`. */
export interface State {
  tasks: Task[]
  loading: boolean
  error: string | null
}

/**
 * All actions that can mutate task state.
 * `DELETE` carries the task id; all others carry a full Task or task array.
 */
export type Action =
  | { type: 'LOADING' }
  | { type: 'LOADED'; payload: Task[] }
  | { type: 'ERROR'; payload: string }
  | { type: 'ADD'; payload: Task }
  | { type: 'UPDATE'; payload: Task }
  | { type: 'DELETE'; payload: string }

/** Pure reducer for task state; exported separately so it can be tested in isolation. */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null }
    case 'LOADED':
      return { tasks: action.payload, loading: false, error: null }
    case 'ERROR':
      return { ...state, loading: false, error: action.payload }
    case 'ADD':
      return { ...state, tasks: [action.payload, ...state.tasks] }
    case 'UPDATE':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      }
    case 'DELETE':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) }
    default:
      return state
  }
}

/**
 * Fetches tasks from the API and exposes optimistic CRUD mutations.
 *
 * `toggleTask` applies the status flip immediately and rolls back on failure.
 * `deleteTask` removes the item immediately and re-fetches on failure to restore state.
 *
 * @param statusFilter - `'Pending'` | `'Completed'` to filter; omit or pass `'All'` for all tasks
 * @param sort         - `'dueDate'` to sort ascending by due date; omit for default (newest first)
 */
export function useTasks(statusFilter?: string, sort?: string) {
  const [state, dispatch] = useReducer(reducer, { tasks: [], loading: false, error: null })

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' })
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter)
      if (sort) params.set('sort', sort)
      const { data } = await client.get<Task[]>(`/tasks?${params}`)
      dispatch({ type: 'LOADED', payload: data })
    } catch {
      dispatch({ type: 'ERROR', payload: 'Failed to load tasks' })
    }
  }, [statusFilter, sort])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createTask = async (payload: {
    title: string
    description?: string
    priority: string
    dueDate?: string
  }) => {
    const { data } = await client.post<Task>('/tasks', payload)
    dispatch({ type: 'ADD', payload: data })
    return data
  }

  const toggleTask = async (task: Task) => {
    const updated = { ...task, status: task.status === 'Pending' ? 'Completed' : 'Pending' }
    dispatch({ type: 'UPDATE', payload: updated as Task })
    try {
      const { data } = await client.put<Task>(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        status: updated.status,
        priority: task.priority,
        dueDate: task.dueDate,
      })
      dispatch({ type: 'UPDATE', payload: data })
    } catch {
      dispatch({ type: 'UPDATE', payload: task })
      throw new Error('Failed to update task')
    }
  }

  const deleteTask = async (id: string) => {
    dispatch({ type: 'DELETE', payload: id })
    try {
      await client.delete(`/tasks/${id}`)
    } catch {
      await fetch()
      throw new Error('Failed to delete task')
    }
  }

  return { ...state, createTask, toggleTask, deleteTask, refresh: fetch }
}
