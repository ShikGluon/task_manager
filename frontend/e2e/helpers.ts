import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Unique email per call so tests never collide on the same account. */
export function uniqueEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@e2e.test`
}

export async function register(page: Page, email: string, password = 'testpass123') {
  await page.goto('/register')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('min 8 characters').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('/')
}

export async function login(page: Page, email: string, password = 'testpass123') {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}

export async function createTask(
  page: Page,
  title: string,
  opts: { priority?: string; description?: string } = {},
) {
  await page.getByRole('button', { name: '+ New task' }).click()
  await page.getByPlaceholder('Task title *').fill(title)
  if (opts.description) await page.getByPlaceholder('Description (optional)').fill(opts.description)
  if (opts.priority) await page.getByRole('combobox').selectOption(opts.priority)
  await page.getByRole('button', { name: 'Create task' }).click()
  await expect(page.getByText(title, { exact: true })).toBeVisible()
}
