import { useReducer, useEffect, useCallback } from 'react'
import client from '../api/client'

export interface Task {
  id: string
  title: string
  description?: string
  status: 'Pending' | 'Completed'
  priority: 'Low' | 'Medium' | 'High'
  dueDate?: string
  createdAt: string
}

export interface State {
  tasks: Task[]
  loading: boolean
  error: string | null
}

export type Action =
  | { type: 'LOADING' }
  | { type: 'LOADED'; payload: Task[] }
  | { type: 'ERROR'; payload: string }
  | { type: 'ADD'; payload: Task }
  | { type: 'UPDATE'; payload: Task }
  | { type: 'DELETE'; payload: string }

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
