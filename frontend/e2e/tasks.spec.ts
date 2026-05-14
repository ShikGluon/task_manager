import { test, expect } from '@playwright/test'
import { uniqueEmail, register, createTask } from './helpers'

test.describe('Task management', () => {
  // Each test gets its own fresh user so tasks never bleed between tests
  test.beforeEach(async ({ page }) => {
    await register(page, uniqueEmail())
  })

  test('shows empty state when there are no tasks', async ({ page }) => {
    await expect(page.getByText(/no tasks here/i)).toBeVisible()
  })

  test('can create a task and see it in the list', async ({ page }) => {
    await createTask(page, 'Buy oat milk')
    await expect(page.getByText('Buy oat milk')).toBeVisible()
  })

  test('create form closes and resets after submission', async ({ page }) => {
    await createTask(page, 'Write README')
    await expect(page.getByPlaceholder('Task title *')).not.toBeVisible()
  })

  test('new task defaults to Pending status', async ({ page }) => {
    await createTask(page, 'Default status task')
    const checkbox = page.getByRole('checkbox').first()
    await expect(checkbox).not.toBeChecked()
  })

  test('can toggle a task to Completed', async ({ page }) => {
    await createTask(page, 'Learn Playwright')
    const checkbox = page.getByRole('checkbox').first()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await expect(page.getByText('Learn Playwright')).toHaveClass(/line-through/)
  })

  test('can toggle a Completed task back to Pending', async ({ page }) => {
    await createTask(page, 'Toggle back task')
    const checkbox = page.getByRole('checkbox').first()
    await checkbox.click() // → Completed
    await checkbox.click() // → Pending
    await expect(checkbox).not.toBeChecked()
    await expect(page.getByText('Toggle back task')).not.toHaveClass(/line-through/)
  })

  test('can delete a task', async ({ page }) => {
    await createTask(page, 'Task to delete')
    await expect(page.getByText('Task to delete')).toBeVisible()

    await page.getByText('Delete', { exact: true }).first().click()

    await expect(page.getByText('Task to delete')).not.toBeVisible()
    await expect(page.getByText('Task deleted')).toBeVisible({ timeout: 10_000 })
  })

  test('can create multiple tasks', async ({ page }) => {
    await createTask(page, 'Alpha task')
    await createTask(page, 'Beta task')
    await createTask(page, 'Gamma task')

    await expect(page.getByText('Alpha task')).toBeVisible()
    await expect(page.getByText('Beta task')).toBeVisible()
    await expect(page.getByText('Gamma task')).toBeVisible()
  })

  test('filter Pending shows only pending tasks', async ({ page }) => {
    await createTask(page, 'Keep pending')
    await createTask(page, 'Mark complete')

    // Complete the second task
    await page.getByRole('checkbox').nth(0).click()

    // Filter to Pending only
    await page.getByRole('button', { name: 'Pending' }).click()

    await expect(page.getByText('Keep pending')).toBeVisible()
    await expect(page.getByText('Mark complete')).not.toBeVisible()
  })

  test('filter Completed shows only completed tasks', async ({ page }) => {
    await createTask(page, 'Will be done')
    await createTask(page, 'Still pending')

    // Complete the first-created task (oldest, at bottom since list is newest-first)
    await page.getByRole('checkbox').last().click()

    await page.getByRole('button', { name: 'Completed' }).click()

    await expect(page.getByText('Will be done')).toBeVisible()
    await expect(page.getByText('Still pending')).not.toBeVisible()
  })

  test('filter All shows all tasks', async ({ page }) => {
    await createTask(page, 'First')
    await createTask(page, 'Second')
    await page.getByRole('checkbox').first().click()

    await page.getByRole('button', { name: 'Completed' }).click()
    await page.getByRole('button', { name: 'All' }).click()

    await expect(page.getByText('First')).toBeVisible()
    await expect(page.getByText('Second')).toBeVisible()
  })

  test('priority badge is shown on task card', async ({ page }) => {
    await createTask(page, 'High priority task', { priority: 'High' })
    await expect(page.getByText('High', { exact: true })).toBeVisible()
  })

  test('sort by due date toggle is clickable', async ({ page }) => {
    const sortBtn = page.getByRole('button', { name: /sort by due date/i })
    await sortBtn.click()
    await expect(sortBtn).toHaveClass(/border-indigo-500/)
    await sortBtn.click()
    await expect(sortBtn).not.toHaveClass(/border-indigo-500/)
  })

  test('Cancel hides the new task form', async ({ page }) => {
    await page.getByRole('button', { name: '+ New task' }).click()
    await expect(page.getByPlaceholder('Task title *')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByPlaceholder('Task title *')).not.toBeVisible()
  })

  test('user data is isolated — other users cannot see your tasks', async ({ browser }) => {
    // User A creates a task
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await register(pageA, uniqueEmail())
    await createTask(pageA, 'User A private task')

    // User B registers separately and should see an empty dashboard
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await register(pageB, uniqueEmail())

    await expect(pageB.getByText('User A private task')).not.toBeVisible()
    await expect(pageB.getByText(/no tasks here/i)).toBeVisible()

    await ctxA.close()
    await ctxB.close()
  })
})
