import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TaskSkeleton } from '../components/TaskSkeleton'

describe('TaskSkeleton', () => {
  it('renders a pulsing placeholder', () => {
    const { container } = render(<TaskSkeleton />)
    const root = container.firstChild as HTMLElement
    expect(root).toBeInTheDocument()
    expect(root.className).toContain('animate-pulse')
  })
})
