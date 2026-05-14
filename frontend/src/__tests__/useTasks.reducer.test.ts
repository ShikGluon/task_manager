import { describe, it, expect } from 'vitest'
import { reducer } from '../hooks/useTasks'
import type { State, Task } from '../hooks/useTasks'

const task1: Task = { id: '1', title: 'Task 1', status: 'Pending', priority: 'Low', createdAt: '' }
const task2: Task = { id: '2', title: 'Task 2', status: 'Pending', priority: 'High', createdAt: '' }

const initial: State = { tasks: [task1, task2], loading: false, error: null }

describe('useTasks reducer', () => {
  it('LOADING sets loading=true and clears error', () => {
    const state = reducer({ ...initial, error: 'oops' }, { type: 'LOADING' })
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
    expect(state.tasks).toEqual(initial.tasks)
  })

  it('LOADED replaces tasks and clears loading', () => {
    const newTasks = [task1]
    const state = reducer({ ...initial, loading: true }, { type: 'LOADED', payload: newTasks })
    expect(state.loading).toBe(false)
    expect(state.tasks).toEqual(newTasks)
    expect(state.error).toBeNull()
  })

  it('ERROR sets error message and clears loading', () => {
    const state = reducer(
      { ...initial, loading: true },
      { type: 'ERROR', payload: 'Network error' },
    )
    expect(state.loading).toBe(false)
    expect(state.error).toBe('Network error')
    expect(state.tasks).toEqual(initial.tasks)
  })

  it('ADD prepends the new task', () => {
    const newTask: Task = {
      id: '3',
      title: 'New',
      status: 'Pending',
      priority: 'Medium',
      createdAt: '',
    }
    const state = reducer(initial, { type: 'ADD', payload: newTask })
    expect(state.tasks[0]).toEqual(newTask)
    expect(state.tasks).toHaveLength(3)
  })

  it('UPDATE replaces the matching task by id', () => {
    const updated = { ...task1, status: 'Completed' as const }
    const state = reducer(initial, { type: 'UPDATE', payload: updated })
    expect(state.tasks.find((t) => t.id === '1')?.status).toBe('Completed')
    expect(state.tasks).toHaveLength(2)
  })

  it('UPDATE does not affect other tasks', () => {
    const updated = { ...task1, title: 'Changed' }
    const state = reducer(initial, { type: 'UPDATE', payload: updated })
    expect(state.tasks.find((t) => t.id === '2')).toEqual(task2)
  })

  it('DELETE removes task by id', () => {
    const state = reducer(initial, { type: 'DELETE', payload: '1' })
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks.find((t) => t.id === '1')).toBeUndefined()
  })

  it('DELETE preserves other tasks', () => {
    const state = reducer(initial, { type: 'DELETE', payload: '1' })
    expect(state.tasks[0]).toEqual(task2)
  })

  it('is a pure function — does not mutate original state', () => {
    const frozen = Object.freeze({ ...initial, tasks: [...initial.tasks] })
    expect(() => reducer(frozen, { type: 'LOADING' })).not.toThrow()
  })
})
